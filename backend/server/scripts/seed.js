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
const { computeScore, refreshLocationStatus } = require('../services/health.service');
const { DEFAULT_THRESHOLDS, DEFAULT_OUTAGE_RULE } = require('../utils/constants');
const { hoursAgo } = require('../utils/dates');

const PASSWORD = 'Password123!';

const ACCOUNTS = [
  { name: 'Student User', email: 'student@campus.test', role: 'student' },
  { name: 'IT Staff', email: 'it@campus.test', role: 'it' },
  { name: 'Network Manager', email: 'manager@campus.test', role: 'manager' },
  { name: 'Campus Admin', email: 'admin@campus.test', role: 'admin' },
];

function sample(metrics, when) {
  const scored = computeScore(metrics, 0, 0, DEFAULT_THRESHOLDS);
  return { ...metrics, ...scored, createdAt: when, updatedAt: when };
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
  ]);

  await Setting.create({
    key: 'default',
    thresholds: { ...DEFAULT_THRESHOLDS },
    outageRule: { ...DEFAULT_OUTAGE_RULE },
  });

  const users = {};
  for (const account of ACCOUNTS) {
    users[account.role] = await User.create({ ...account, password: PASSWORD, accountStatus: 'active' });
  }

  const library = await Location.create({
    name: 'Main Library',
    building: 'Engineering Hall',
    floor: '2',
    description: 'Quiet floors and group study rooms.',
    mapPosition: { x: 12, y: 40 },
  });
  const dorm = await Location.create({
    name: 'North Dorm',
    building: 'Residence A',
    floor: '5',
    description: 'Residence hall common area and rooms.',
    mapPosition: { x: 70, y: 18 },
  });
  const lab = await Location.create({
    name: 'Lab 3',
    building: 'Science Center',
    floor: '1',
    description: 'Teaching lab with shared access points.',
    mapPosition: { x: 33, y: 77 },
  });

  const good = { download: 80, upload: 20, ping: 18, packetLoss: 0.2 };
  const badDay = { download: 2, upload: 0.5, ping: 240, packetLoss: 12 };
  const poor = { download: 8, upload: 2, ping: 180, packetLoss: 6 };
  const fair = { download: 40, upload: 10, ping: 45, packetLoss: 1 };

  const testDocs = [];

  for (let day = 0; day <= 13; day += 1) {
    const metrics = day === 10 ? badDay : good;
    const scored = sample(metrics, hoursAgo(day * 24 + 12));
    testDocs.push({
      user: users.student._id,
      location: library._id,
      download: scored.download,
      upload: scored.upload,
      ping: scored.ping,
      packetLoss: scored.packetLoss,
      score: scored.score,
      band: scored.band,
      components: scored.components,
      recentFailures: 0,
      recentComplaints: 0,
      trendMessage: null,
      problemFlag: null,
      createdAt: scored.createdAt,
      updatedAt: scored.updatedAt,
    });
  }

  for (let day = 0; day <= 6; day += 1) {
    const scored = sample(poor, hoursAgo(day * 24 + 5));
    testDocs.push({
      user: users.student._id,
      location: dorm._id,
      download: scored.download,
      upload: scored.upload,
      ping: scored.ping,
      packetLoss: scored.packetLoss,
      score: scored.score,
      band: scored.band,
      components: scored.components,
      recentFailures: 0,
      recentComplaints: 0,
      trendMessage: null,
      problemFlag: day < 5 ? `Possible network problem detected in ${dorm.name}` : null,
      createdAt: scored.createdAt,
      updatedAt: scored.updatedAt,
    });
  }

  for (let day = 0; day <= 4; day += 1) {
    const scored = sample(fair, hoursAgo(day * 24 + 8));
    testDocs.push({
      user: users.student._id,
      location: lab._id,
      download: scored.download,
      upload: scored.upload,
      ping: scored.ping,
      packetLoss: scored.packetLoss,
      score: scored.score,
      band: scored.band,
      components: scored.components,
      recentFailures: 0,
      recentComplaints: 0,
      trendMessage: null,
      problemFlag: null,
      createdAt: scored.createdAt,
      updatedAt: scored.updatedAt,
    });
  }

  await Test.collection.insertMany(testDocs);
  await refreshLocationStatus(library._id, null);
  await refreshLocationStatus(dorm._id, null);
  await refreshLocationStatus(lab._id, null);

  await Complaint.collection.insertMany([
    {
      user: users.student._id,
      location: dorm._id,
      type: 'slow internet',
      description: 'Videos buffer constantly in the north dorm lounge.',
      status: 'Submitted',
      relatedTest: null,
      assignedTo: null,
      notes: [],
      createdAt: hoursAgo(50),
      updatedAt: hoursAgo(50),
    },
    {
      user: users.student._id,
      location: dorm._id,
      type: 'slow internet',
      description: 'Downloads stall on the fifth floor.',
      status: 'Reviewed',
      relatedTest: null,
      assignedTo: null,
      notes: [],
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(28),
    },
    {
      user: users.student._id,
      location: lab._id,
      type: 'wifi dropping',
      description: 'The lab wifi drops every few minutes during class.',
      status: 'Submitted',
      relatedTest: null,
      assignedTo: null,
      notes: [],
      createdAt: hoursAgo(40),
      updatedAt: hoursAgo(40),
    },
  ]);

  await Outage.collection.insertMany([
    {
      location: dorm._id,
      type: 'slow internet',
      normalizedType: 'slow internet',
      status: 'resolved',
      complaintCount: 3,
      startedAt: hoursAgo(120),
      resolvedAt: hoursAgo(100),
      resolvedReason: 'seed',
      createdAt: hoursAgo(120),
      updatedAt: hoursAgo(100),
    },
  ]);

  const statuses = await Location.find().select('name currentStatus');
  console.log('Seed complete.');
  console.log(`Password for every account: ${PASSWORD}`);
  for (const account of ACCOUNTS) {
    console.log(`  ${account.role.padEnd(8)} ${account.email}`);
  }
  for (const location of statuses) {
    console.log(`  ${location.name}: ${location.currentStatus}`);
  }
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
