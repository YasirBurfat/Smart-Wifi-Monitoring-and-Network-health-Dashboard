const mongoose = require('mongoose');
const Location = require('../models/Location');
const Test = require('../models/Test');
const Complaint = require('../models/Complaint');
const Outage = require('../models/Outage');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { daysAgo, recentDates } = require('../utils/dates');
const { roundTo } = require('../utils/numbers');
const { PROBLEM_BANDS, LOCATION_STATUSES } = require('../utils/constants');

function countOf(rows) {
  return rows && rows[0] ? rows[0].count || 0 : 0;
}

function averageOf(row, field) {
  if (!row || row[field] == null) return null;
  return roundTo(row[field], 1);
}

async function dashboardSummary() {
  const since = daysAgo(1);
  const [locationRows, testRows, complaintRows, outageRows, userRows, locations, hourPattern] = await Promise.all([
    Location.aggregate([
      { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
    ]),
    Test.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          last24h: [{ $match: { createdAt: { $gte: since } } }, { $count: 'count' }],
          last24hStats: [
            { $match: { createdAt: { $gte: since } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgDownload: { $avg: '$download' },
                avgUpload: { $avg: '$upload' },
                avgPing: { $avg: '$ping' },
              },
            },
          ],
          average: [{ $group: { _id: null, averageScore: { $avg: '$score' } } }],
        },
      },
    ]),
    Complaint.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          open: [{ $match: { status: { $ne: 'Resolved' } } }, { $count: 'count' }],
          resolved: [{ $match: { status: 'Resolved' } }, { $count: 'count' }],
          last24h: [{ $match: { createdAt: { $gte: since } } }, { $count: 'count' }],
        },
      },
    ]),
    Outage.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: 'active' } }, { $count: 'count' }],
        },
      },
    ]),
    User.aggregate([{ $count: 'count' }]),
    dashboardHeatmap(),
    hourly(),
  ]);

  const byStatus = {};
  for (const status of LOCATION_STATUSES) byStatus[status] = 0;
  let locationTotal = 0;
  for (const row of locationRows) {
    const key = Object.prototype.hasOwnProperty.call(byStatus, row._id) ? row._id : 'Unknown';
    byStatus[key] += row.count;
    locationTotal += row.count;
  }

  const tests = testRows[0] || { total: [], last24h: [], last24hStats: [], average: [] };
  const complaints = complaintRows[0] || { total: [], open: [], resolved: [], last24h: [] };
  const outages = outageRows[0] || { total: [], active: [] };
  const day = tests.last24hStats && tests.last24hStats[0];

  return {
    testsToday: day ? day.count : 0,
    avgDownload: averageOf(day, 'avgDownload'),
    avgUpload: averageOf(day, 'avgUpload'),
    avgPing: averageOf(day, 'avgPing'),
    poorLocations: (byStatus.Poor || 0) + (byStatus.Critical || 0),
    openComplaints: countOf(complaints.open),
    resolvedComplaints: countOf(complaints.resolved),
    currentOutages: countOf(outages.active),
    locations,
    hourly: hourPattern.hours,
    totals: {
      locations: { total: locationTotal, byStatus },
      tests: {
        total: countOf(tests.total),
        last24h: countOf(tests.last24h),
        averageScore: averageOf(tests.average[0], 'averageScore'),
      },
      complaints: {
        total: countOf(complaints.total),
        open: countOf(complaints.open),
        resolved: countOf(complaints.resolved),
        last24h: countOf(complaints.last24h),
      },
      outages: {
        total: countOf(outages.total),
        active: countOf(outages.active),
      },
      users: { total: countOf(userRows) },
    },
  };
}

async function dashboardHeatmap() {
  const since = daysAgo(1);
  const rows = await Location.aggregate([
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          {
            $group: {
              _id: null,
              averageScore: { $avg: '$score' },
              averageDownload: { $avg: '$download' },
              averageUpload: { $avg: '$upload' },
              averagePing: { $avg: '$ping' },
              testCount: { $sum: 1 },
            },
          },
        ],
        as: 'stats',
      },
    },
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $gte: ['$createdAt', since] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'recent',
      },
    },
    {
      $lookup: {
        from: Complaint.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $ne: ['$status', 'Resolved'] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'openComplaints',
      },
    },
    {
      $lookup: {
        from: Complaint.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          { $count: 'count' },
        ],
        as: 'complaints',
      },
    },
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { download: 1, createdAt: 1 } },
        ],
        as: 'latest',
      },
    },
    {
      $project: {
        name: 1,
        building: 1,
        floor: 1,
        currentStatus: 1,
        mapPosition: 1,
        averageScore: { $ifNull: [{ $arrayElemAt: ['$stats.averageScore', 0] }, null] },
        averageDownload: { $ifNull: [{ $arrayElemAt: ['$stats.averageDownload', 0] }, null] },
        averageUpload: { $ifNull: [{ $arrayElemAt: ['$stats.averageUpload', 0] }, null] },
        averagePing: { $ifNull: [{ $arrayElemAt: ['$stats.averagePing', 0] }, null] },
        testCount: { $ifNull: [{ $arrayElemAt: ['$stats.testCount', 0] }, 0] },
        recentTestCount: { $ifNull: [{ $arrayElemAt: ['$recent.count', 0] }, 0] },
        openComplaints: { $ifNull: [{ $arrayElemAt: ['$openComplaints.count', 0] }, 0] },
        complaintCount: { $ifNull: [{ $arrayElemAt: ['$complaints.count', 0] }, 0] },
        latestDownload: { $ifNull: [{ $arrayElemAt: ['$latest.download', 0] }, null] },
        latestAt: { $ifNull: [{ $arrayElemAt: ['$latest.createdAt', 0] }, null] },
      },
    },
    { $sort: { building: 1, name: 1 } },
  ]);

  return rows.map((row) => ({
    id: row._id,
    name: row.name,
    building: row.building,
    floor: row.floor || '',
    mapPosition: {
      x: row.mapPosition?.x ?? 0,
      y: row.mapPosition?.y ?? 0,
    },
    currentStatus: row.currentStatus,
    networkStatus: row.currentStatus,
    status: row.currentStatus,
    averageScore: roundTo(row.averageScore, 1),
    averageDownload: roundTo(row.averageDownload, 1),
    averageUpload: roundTo(row.averageUpload, 1),
    averagePing: roundTo(row.averagePing, 1),
    avgDownload: roundTo(row.averageDownload, 1),
    avgUpload: roundTo(row.averageUpload, 1),
    avgPing: roundTo(row.averagePing, 1),
    latestDownload: roundTo(row.latestDownload, 1),
    latestAt: row.latestAt || null,
    testCount: row.testCount,
    tests: row.testCount,
    recentTestCount: row.recentTestCount,
    openComplaints: row.openComplaints,
    complaintCount: row.complaintCount,
    complaints: row.complaintCount,
  }));
}

async function seriesByDay(start, dates) {
  const [testRows, complaintRows] = await Promise.all([
    Test.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          averageScore: { $avg: '$score' },
          averageDownload: { $avg: '$download' },
          testCount: { $sum: 1 },
        },
      },
    ]),
    Complaint.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          complaintCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const tests = new Map(testRows.map((row) => [row._id, row]));
  const complaints = new Map(complaintRows.map((row) => [row._id, row.complaintCount]));

  return dates.map((date) => {
    const test = tests.get(date);
    return {
      date,
      averageScore: test ? roundTo(test.averageScore, 1) : null,
      averageDownload: test ? roundTo(test.averageDownload, 1) : null,
      testCount: test ? test.testCount : 0,
      complaintCount: complaints.get(date) || 0,
    };
  });
}

async function dashboardTrends() {
  const days = 14;
  return seriesByDay(daysAgo(days), recentDates(days));
}

async function daily() {
  const days = 30;
  return seriesByDay(daysAgo(days), recentDates(days));
}

async function hourly() {
  const since = daysAgo(14);
  const rows = await Test.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $hour: { date: '$createdAt', timezone: 'UTC' } },
        averageScore: { $avg: '$score' },
        averageDownload: { $avg: '$download' },
        averagePing: { $avg: '$ping' },
        testCount: { $sum: 1 },
      },
    },
  ]);
  const byHour = new Map(rows.map((row) => [row._id, row]));
  const hours = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const row = byHour.get(hour);
    const label = `${String(hour).padStart(2, '0')}:00`;
    hours.push({
      hour,
      label,
      download: row ? roundTo(row.averageDownload, 1) : 0,
      ping: row ? roundTo(row.averagePing, 1) : 0,
      averageScore: row ? roundTo(row.averageScore, 1) : null,
      averageDownload: row ? roundTo(row.averageDownload, 1) : null,
      averagePing: row ? roundTo(row.averagePing, 1) : null,
      testCount: row ? row.testCount : 0,
    });
  }
  return { windowDays: 14, timezone: 'UTC', hours };
}

async function byLocation() {
  const rows = await Location.aggregate([
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          {
            $group: {
              _id: null,
              testCount: { $sum: 1 },
              averageScore: { $avg: '$score' },
              averageDownload: { $avg: '$download' },
              averageUpload: { $avg: '$upload' },
              averagePing: { $avg: '$ping' },
              averagePacketLoss: { $avg: '$packetLoss' },
            },
          },
        ],
        as: 'stats',
      },
    },
    { $sort: { building: 1, name: 1 } },
  ]);

  return rows.map((row) => {
    const stats = row.stats[0];
    return {
      locationId: row._id,
      name: row.name,
      building: row.building,
      floor: row.floor || '',
      currentStatus: row.currentStatus,
      testCount: stats?.testCount || 0,
      averageScore: stats ? roundTo(stats.averageScore, 1) : null,
      averageDownload: stats ? roundTo(stats.averageDownload, 1) : null,
      averageUpload: stats ? roundTo(stats.averageUpload, 1) : null,
      averagePing: stats ? roundTo(stats.averagePing, 1) : null,
      averagePacketLoss: stats ? roundTo(stats.averagePacketLoss, 1) : null,
    };
  });
}

async function complaintsByBuilding() {
  const rows = await Location.aggregate([
    { $group: { _id: '$building' } },
    { $sort: { _id: 1 } },
    {
      $lookup: {
        from: Complaint.collection.collectionName,
        let: { building: '$_id' },
        pipeline: [
          {
            $lookup: {
              from: Location.collection.collectionName,
              localField: 'location',
              foreignField: '_id',
              as: 'loc',
            },
          },
          { $unwind: '$loc' },
          { $match: { $expr: { $eq: ['$loc.building', '$$building'] } } },
          {
            $facet: {
              total: [{ $count: 'count' }],
              open: [{ $match: { status: { $ne: 'Resolved' } } }, { $count: 'count' }],
              byType: [
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1, _id: 1 } },
              ],
              byStatus: [
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ],
        as: 'stats',
      },
    },
  ]);

  return rows.map((row) => {
    const stats = row.stats[0] || { total: [], open: [], byType: [], byStatus: [] };
    return {
      building: row._id,
      total: countOf(stats.total),
      open: countOf(stats.open),
      byType: (stats.byType || []).map((item) => ({ type: item._id, count: item.count })),
      byStatus: (stats.byStatus || []).map((item) => ({ status: item._id, count: item.count })),
    };
  });
}

async function problemLocations() {
  const rows = await Location.aggregate([
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $group: {
              _id: null,
              sample: { $sum: 1 },
              poor: {
                $sum: { $cond: [{ $in: ['$band', PROBLEM_BANDS] }, 1, 0] },
              },
            },
          },
        ],
        as: 'recent',
      },
    },
    {
      $lookup: {
        from: Outage.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $eq: ['$status', 'active'] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'outages',
      },
    },
    {
      $lookup: {
        from: Complaint.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $ne: ['$status', 'Resolved'] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'openComplaints',
      },
    },
    {
      $addFields: {
        poorOrCriticalRecent: { $ifNull: [{ $arrayElemAt: ['$recent.poor', 0] }, 0] },
        recentSampleSize: { $ifNull: [{ $arrayElemAt: ['$recent.sample', 0] }, 0] },
        activeOutages: { $ifNull: [{ $arrayElemAt: ['$outages.count', 0] }, 0] },
        openComplaints: { $ifNull: [{ $arrayElemAt: ['$openComplaints.count', 0] }, 0] },
      },
    },
    {
      $match: {
        $or: [
          { currentStatus: { $in: PROBLEM_BANDS } },
          { activeOutages: { $gt: 0 } },
          { poorOrCriticalRecent: { $gte: 3 } },
        ],
      },
    },
    { $sort: { poorOrCriticalRecent: -1, activeOutages: -1, name: 1 } },
  ]);

  return rows.map((row) => {
    const reasons = [];
    if (PROBLEM_BANDS.includes(row.currentStatus)) {
      reasons.push(`current status is ${row.currentStatus}`);
    }
    if (row.poorOrCriticalRecent >= 3) {
      reasons.push(`${row.poorOrCriticalRecent} of the last ${row.recentSampleSize} tests are Poor or Critical`);
    }
    if (row.activeOutages > 0) {
      reasons.push(row.activeOutages === 1 ? 'an outage is active' : `${row.activeOutages} outages are active`);
    }
    return {
      locationId: row._id,
      name: row.name,
      building: row.building,
      floor: row.floor || '',
      currentStatus: row.currentStatus,
      poorOrCriticalRecent: row.poorOrCriticalRecent,
      recentSampleSize: row.recentSampleSize,
      activeOutages: row.activeOutages,
      openComplaints: row.openComplaints,
      reasons,
    };
  });
}

async function locationSummary(locationId) {
  const since = daysAgo(1);
  const objectId = locationId instanceof mongoose.Types.ObjectId
    ? locationId
    : new mongoose.Types.ObjectId(String(locationId));
  const rows = await Location.aggregate([
    { $match: { _id: objectId } },
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'latestTest',
      },
    },
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$location', '$$id'] } } },
          { $group: { _id: null, averageScore: { $avg: '$score' }, testCount: { $sum: 1 } } },
        ],
        as: 'allTests',
      },
    },
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $gte: ['$createdAt', since] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'recentTests',
      },
    },
    {
      $lookup: {
        from: Complaint.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $ne: ['$status', 'Resolved'] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'openComplaints',
      },
    },
    {
      $lookup: {
        from: Outage.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $eq: ['$status', 'active'] }],
              },
            },
          },
          { $sort: { startedAt: -1 } },
        ],
        as: 'activeOutages',
      },
    },
  ]);

  const row = rows[0];
  if (!row) throw new ApiError(404, 'Location not found');

  const latest = row.latestTest[0] || null;
  const active = row.activeOutages || [];

  return {
    location: {
      id: row._id,
      name: row.name,
      building: row.building,
      floor: row.floor || '',
      description: row.description || '',
      mapPosition: {
        x: row.mapPosition?.x ?? 0,
        y: row.mapPosition?.y ?? 0,
      },
    },
    currentStatus: row.currentStatus,
    latestTest: latest
      ? {
        id: latest._id,
        download: latest.download,
        upload: latest.upload,
        ping: latest.ping,
        packetLoss: latest.packetLoss,
        score: latest.score,
        band: latest.band,
        trendMessage: latest.trendMessage || null,
        problemFlag: latest.problemFlag || null,
        createdAt: latest.createdAt,
      }
      : null,
    averageScore: row.allTests[0] ? roundTo(row.allTests[0].averageScore, 1) : null,
    testCount: row.allTests[0]?.testCount || 0,
    recentTestCount: countOf(row.recentTests),
    recentWindowHours: 24,
    openComplaints: countOf(row.openComplaints),
    activeOutage: active[0]
      ? {
        id: active[0]._id,
        type: active[0].type,
        status: active[0].status,
        complaintCount: active[0].complaintCount,
        startedAt: active[0].startedAt,
      }
      : null,
    activeOutages: active.map((outage) => ({
      id: outage._id,
      type: outage.type,
      status: outage.status,
      complaintCount: outage.complaintCount,
      startedAt: outage.startedAt,
    })),
  };
}

module.exports = {
  dashboardSummary,
  dashboardHeatmap,
  dashboardTrends,
  hourly,
  daily,
  byLocation,
  complaintsByBuilding,
  problemLocations,
  locationSummary,
};
