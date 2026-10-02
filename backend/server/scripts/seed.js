const mongoose = require('mongoose');
require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Location = require('../models/Location');
const Test = require('../models/Test');
const Complaint = require('../models/Complaint');
const Outage = require('../models/Outage');
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { logActivity } = require('../services/activity.service');
const { computeScore, refreshLocationStatus } = require('../services/health.service');
const { COMPLAINT_CATEGORIES, DEFAULT_THRESHOLDS, DEFAULT_OUTAGE_RULE } = require('../utils/constants');

const PASSWORD = 'Password123!';
const DAY_COUNT = 30;
const COMPLAINT_COUNT = 60;

const WEIGHTS = {
  download: 30,
  upload: 15,
  ping: 25,
  packetLoss: 20,
  stability: 10,
};

const ACCOUNTS = [
  { name: 'Student User', email: 'student@campus.test', role: 'student' },
  { name: 'IT Staff', email: 'it@campus.test', role: 'it' },
  { name: 'Network Manager', email: 'manager@campus.test', role: 'manager' },
  { name: 'Campus Admin', email: 'admin@campus.test', role: 'admin' },
];

const LOCATION_DEFS = [
  {
    name: 'Main Library',
    building: 'Engineering Hall',
    floor: '2',
    description: 'Quiet floors and group study rooms.',
    mapPosition: { x: 18, y: 22 },
    pattern: 'library',
  },
  {
    name: 'North Dorm',
    building: 'Residence A',
    floor: '5',
    description: 'Residence hall common area and rooms.',
    mapPosition: { x: 72, y: 18 },
    pattern: 'steady',
  },
  {
    name: 'Lab 3',
    building: 'Science Center',
    floor: '1',
    description: 'Teaching lab with shared access points.',
    mapPosition: { x: 34, y: 70 },
    pattern: 'steady',
  },
  {
    name: 'Hostel',
    building: 'Residence B',
    floor: '3',
    description: 'Hostel rooms and the evening study lounge.',
    mapPosition: { x: 78, y: 62 },
    pattern: 'hostel',
  },
  {
    name: 'Student Center',
    building: 'Campus Center',
    floor: '1',
    description: 'Food hall, clubs, and shared tables.',
    mapPosition: { x: 48, y: 40 },
    pattern: 'steady',
  },
  {
    name: 'Admin Building',
    building: 'Administration',
    floor: '2',
    description: 'Staff offices and the service desk.',
    mapPosition: { x: 12, y: 58 },
    pattern: 'steady',
  },
  {
    name: 'Cafeteria',
    building: 'Campus Center',
    floor: '0',
    description: 'Dining room wireless.',
    mapPosition: { x: 56, y: 74 },
    pattern: 'steady',
  },
  {
    name: 'Sports Hall',
    building: 'Athletics',
    floor: '1',
    description: 'Courts and locker rooms.',
    mapPosition: { x: 88, y: 36 },
    pattern: 'steady',
  },
];

const COMPLAINT_STATUSES = ['Submitted', 'Reviewed', 'Assigned', 'In Progress', 'Resolved'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function utcDaysAgoAt(daysBack, hour, minute) {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysBack,
    hour,
    minute,
    0,
    0
  ));
}

function goodMetrics(day) {
  return {
    download: 76 + (day % 8),
    upload: 18 + (day % 3),
    ping: 14 + (day % 5),
    packetLoss: 0.2,
    jitter: 2 + (day % 3),
  };
}

function weakMetrics(day) {
  return {
    download: 5 + (day % 3),
    upload: 1,
    ping: 200 + (day % 20),
    packetLoss: 8,
    jitter: 28 + (day % 6),
  };
}

function buildTest(userId, locationId, metrics, when) {
  const scored = computeScore(
    {
      download: metrics.download,
      upload: metrics.upload,
      ping: metrics.ping,
      packetLoss: metrics.packetLoss,
    },
    0,
    0,
    DEFAULT_THRESHOLDS
  );
  return {
    user: userId,
    location: locationId,
    download: metrics.download,
    upload: metrics.upload,
    ping: metrics.ping,
    jitter: metrics.jitter,
    packetLoss: metrics.packetLoss,
    score: scored.score,
    healthScore: scored.score,
    band: scored.band,
    healthStatus: scored.band,
    components: scored.components,
    recentFailures: 0,
    recentComplaints: 0,
    trendMessage: null,
    problemFlag: null,
    testedAt: when,
    createdAt: when,
    updatedAt: when,
  };
}

function averageScore(rows) {
  return rows.reduce((sum, row) => sum + row.healthScore, 0) / rows.length;
}

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Location.deleteMany({}),
    Test.deleteMany({}),
    Complaint.deleteMany({}),
    Outage.deleteMany({}),
    Setting.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  await Setting.create({
    key: 'default',
    thresholds: { ...DEFAULT_THRESHOLDS },
    weights: { ...WEIGHTS },
    outageRule: { ...DEFAULT_OUTAGE_RULE },
  });

  const users = {};
  for (const account of ACCOUNTS) {
    users[account.role] = await User.create({
      ...account,
      password: PASSWORD,
      accountStatus: 'active',
    });
  }

  const locations = {};
  for (const definition of LOCATION_DEFS) {
    const { pattern, ...fields } = definition;
    const location = await Location.create({ ...fields, currentStatus: 'Unknown' });
    locations[pattern] = locations[pattern] || [];
    locations[pattern].push(location);
    locations[location.name] = location;
  }

  const library = locations['Main Library'];
  const hostel = locations.Hostel;
  const testDocs = [];

  for (let day = 1; day <= DAY_COUNT; day += 1) {
    testDocs.push(buildTest(users.student._id, library._id, goodMetrics(day), utcDaysAgoAt(day, 8, 0)));
    testDocs.push(buildTest(users.student._id, library._id, weakMetrics(day), utcDaysAgoAt(day, 12, 30)));
    testDocs.push(buildTest(users.student._id, library._id, goodMetrics(day), utcDaysAgoAt(day, 16, 0)));
    testDocs.push(buildTest(users.student._id, hostel._id, goodMetrics(day), utcDaysAgoAt(day, 9, 0)));
    testDocs.push(buildTest(users.student._id, hostel._id, goodMetrics(day), utcDaysAgoAt(day, 15, 0)));
    testDocs.push(buildTest(users.student._id, hostel._id, weakMetrics(day), utcDaysAgoAt(day, 20, 0)));
    for (const location of locations.steady) {
      testDocs.push(buildTest(users.student._id, location._id, goodMetrics(day), utcDaysAgoAt(day, 11, 15)));
    }
  }

  const libraryMidday = testDocs.filter((row) => String(row.location) === String(library._id) && row.testedAt.getUTCHours() === 12);
  const libraryMorning = testDocs.filter((row) => String(row.location) === String(library._id) && row.testedAt.getUTCHours() === 8);
  const hostelEvening = testDocs.filter((row) => String(row.location) === String(hostel._id) && row.testedAt.getUTCHours() === 20);
  const hostelMorning = testDocs.filter((row) => String(row.location) === String(hostel._id) && row.testedAt.getUTCHours() === 9);
  if (!(averageScore(libraryMidday) < averageScore(libraryMorning))) {
    throw new Error('Main Library midday tests are not weaker than the morning');
  }
  if (!(averageScore(hostelEvening) < averageScore(hostelMorning))) {
    throw new Error('Hostel evening tests are not weaker than the morning');
  }

  const insertedTests = await Test.insertMany(testDocs);
  const librarySample = insertedTests.find((row) => (
    String(row.location) === String(library._id) && row.testedAt.getUTCHours() === 12
  ));

  for (const location of await Location.find()) {
    await refreshLocationStatus(location._id, null);
  }

  const complaints = [];
  const libraryOutageStart = new Date(Date.now() - 20 * 60 * 1000);
  for (let index = 0; index < 4; index += 1) {
    const createdAt = new Date(libraryOutageStart.getTime() + index * 60 * 1000);
    complaints.push({
      user: users.student._id,
      location: library._id,
      type: 'no connection',
      severity: 'high',
      description: `Main Library lost wireless during the midday window, report ${index + 1}.`,
      status: 'Submitted',
      relatedTest: librarySample ? librarySample._id : null,
      assignedTo: null,
      assignedStaff: null,
      notes: [],
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const placeList = await Location.find().sort({ name: 1 });
  for (let index = 0; index < COMPLAINT_COUNT - 4; index += 1) {
    const location = placeList[index % placeList.length];
    const status = COMPLAINT_STATUSES[index % COMPLAINT_STATUSES.length];
    let type = COMPLAINT_CATEGORIES[index % COMPLAINT_CATEGORIES.length];
    if (location.name === 'Main Library' && type === 'no connection') type = 'slow internet';
    const createdAt = utcDaysAgoAt((index % DAY_COUNT) + 1, 7 + (index % 10), index % 50);
    const assigned = status === 'Assigned' || status === 'In Progress' || status === 'Resolved';
    const notes = index % 7 === 0
      ? [{
        author: users.it._id,
        text: 'Checked the access point and logged the follow-up.',
        createdAt,
      }]
      : [];
    complaints.push({
      user: users.student._id,
      location: location._id,
      type,
      severity: SEVERITIES[index % SEVERITIES.length],
      description: `${type} reported at ${location.name} on day ${index + 1}.`,
      status,
      relatedTest: null,
      assignedTo: assigned ? users.it._id : null,
      assignedStaff: assigned ? users.it._id : null,
      notes,
      resolvedAt: status === 'Resolved' ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  if (complaints.length !== COMPLAINT_COUNT) {
    throw new Error(`Expected ${COMPLAINT_COUNT} complaints, built ${complaints.length}`);
  }
  await Complaint.insertMany(complaints);

  await Outage.create({
    location: library._id,
    type: 'no connection',
    normalizedType: 'no connection',
    status: 'active',
    complaintCount: 4,
    startedAt: libraryOutageStart,
    resolvedAt: null,
    resolvedReason: null,
  });

  await logActivity(users.admin._id, 'create', 'Location', library._id, { name: library.name });
  await logActivity(users.admin._id, 'create', 'Location', locations['North Dorm']._id, { name: 'North Dorm' });
  await logActivity(users.admin._id, 'update', 'Location', library._id, { description: library.description });
  const temp = await Location.create({
    name: 'Seed Temp',
    building: 'Temp',
    floor: '1',
    description: 'Removed during seed so the activity log has a delete entry.',
    mapPosition: { x: 1, y: 1 },
  });
  await logActivity(users.admin._id, 'create', 'Location', temp._id, { name: temp.name });
  await temp.deleteOne();
  await logActivity(users.admin._id, 'delete', 'Location', temp._id, { name: temp.name });

  await Notification.create([
    {
      user: users.student._id,
      role: undefined,
      title: 'Report received',
      body: 'Your Main Library connection report is on file.',
      message: 'Your Main Library connection report is on file.',
      kind: 'complaint',
      type: 'complaint',
      entity: 'Location',
      entityId: library._id,
      read: false,
    },
    {
      user: users.it._id,
      title: 'Library outage',
      body: 'Main Library has an active no-connection outage.',
      message: 'Main Library has an active no-connection outage.',
      kind: 'outage',
      type: 'outage',
      entity: 'Location',
      entityId: library._id,
      read: false,
    },
    {
      role: 'it',
      title: 'Evening hostel pattern',
      body: 'Hostel tests are weak in the evening.',
      message: 'Hostel tests are weak in the evening.',
      kind: 'poor_location',
      type: 'poor_location',
      entity: 'Location',
      entityId: hostel._id,
      read: false,
    },
  ]);

  await Promise.all([
    User.syncIndexes(),
    Location.syncIndexes(),
    Test.syncIndexes(),
    Complaint.syncIndexes(),
    Outage.syncIndexes(),
    Notification.syncIndexes(),
    ActivityLog.syncIndexes(),
    Setting.syncIndexes(),
  ]);

  const storedUser = await User.findOne({ email: 'student@campus.test' }).select('+password +passwordHash');
  if (!storedUser.password.startsWith('$2') || storedUser.password !== storedUser.passwordHash) {
    throw new Error('Seed stored a plaintext password');
  }

  const [usersCount, locationsCount, testsCount, complaintsCount, outagesCount, settingsCount] = await Promise.all([
    User.countDocuments(),
    Location.countDocuments(),
    Test.countDocuments(),
    Complaint.countDocuments(),
    Outage.countDocuments(),
    Setting.countDocuments(),
  ]);
  const activeOutage = await Outage.findOne({ status: 'active' }).populate('location', 'name');
  const oldest = await Test.findOne().sort({ testedAt: 1 }).select('testedAt');
  const newest = await Test.findOne().sort({ testedAt: -1 }).select('testedAt');

  console.log('Seed complete.');
  console.log(`Password for every account: ${PASSWORD}`);
  for (const account of ACCOUNTS) {
    console.log(`  ${account.role.padEnd(8)} ${account.email}`);
  }
  console.log(`counts users=${usersCount} locations=${locationsCount} tests=${testsCount} complaints=${complaintsCount} outages=${outagesCount} settings=${settingsCount}`);
  console.log(`active outage: ${activeOutage ? `${activeOutage.location.name} ${activeOutage.type} ${activeOutage.status} count=${activeOutage.complaintCount}` : 'none'}`);
  console.log(`tests from ${oldest.testedAt.toISOString()} to ${newest.testedAt.toISOString()}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
