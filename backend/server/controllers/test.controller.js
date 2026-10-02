const Test = require('../models/Test');
const Location = require('../models/Location');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { presentTest } = require('../utils/present');
const { getPaging, pageMeta } = require('../utils/pagination');
const { applyLocationFilters, applyCreatedRange } = require('../utils/filters');
const { daysAgo } = require('../utils/dates');
const { PROBLEM_BANDS } = require('../utils/constants');
const { getSettings } = require('../services/setting.service');
const { computeScore, refreshLocationStatus } = require('../services/health.service');
const { resolveIfHealthy } = require('../services/outage.service');
const { logActivity } = require('../services/activity.service');

const TREND_MESSAGE = 'Network performance is lower than the usual average for this location.';

function ownsRecord(user, owner) {
  return String(owner && owner._id ? owner._id : owner) === String(user._id);
}

const create = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  if (body.failed === true || body.completed === false) {
    throw new ApiError(400, 'A failed speed test is not stored');
  }
  const { locationId, packetLoss } = body;
  const download = body.download ?? body.downloadMbps;
  const upload = body.upload ?? body.uploadMbps;
  const ping = body.ping ?? body.pingMs;
  const location = await Location.findById(locationId);
  if (!location) throw new ApiError(404, 'Location not found');

  const since24h = daysAgo(1);
  const since7d = daysAgo(7);
  const [recentFailures, recentComplaints, previousWeek, lastFour] = await Promise.all([
    Test.countDocuments({
      location: location._id,
      createdAt: { $gte: since24h },
      band: { $in: PROBLEM_BANDS },
    }),
    Complaint.countDocuments({
      location: location._id,
      createdAt: { $gte: since24h },
    }),
    Test.aggregate([
      { $match: { location: location._id, createdAt: { $gte: since7d } } },
      { $group: { _id: null, avgDownload: { $avg: '$download' }, count: { $sum: 1 } } },
    ]),
    Test.find({ location: location._id }).sort({ createdAt: -1 }).limit(4).select('band'),
  ]);

  const settings = await getSettings();
  const scored = computeScore(
    { download, upload, ping, packetLoss },
    recentFailures,
    recentComplaints,
    settings.thresholds
  );

  const week = previousWeek[0];
  let trendMessage = null;
  if (week && week.count > 0 && week.avgDownload > 0 && download < week.avgDownload * 0.7) {
    trendMessage = TREND_MESSAGE;
  }

  const recentBands = [...lastFour.map((test) => test.band), scored.band];
  const poorCount = recentBands.filter((band) => PROBLEM_BANDS.includes(band)).length;
  const problemFlag = poorCount >= 3
    ? `Possible network problem detected in ${location.name}`
    : null;

  const test = await Test.create({
    user: req.user._id,
    location: location._id,
    download,
    upload,
    ping,
    packetLoss,
    score: scored.score,
    band: scored.band,
    components: scored.components,
    recentFailures,
    recentComplaints,
    trendMessage,
    problemFlag,
  });

  const updatedLocation = await refreshLocationStatus(location._id, req.user._id);
  await resolveIfHealthy(updatedLocation, req.user._id);
  await logActivity(req.user._id, 'create', 'Test', test._id, {
    location: location._id,
    score: scored.score,
    band: scored.band,
  });

  await test.populate([
    { path: 'user', select: 'name email role' },
    { path: 'location', select: 'name building floor currentStatus' },
  ]);

  res.status(201).json({ ok: true, test: presentTest(test) });
});

const list = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPaging(query);
  const filter = {};
  await applyLocationFilters(filter, query);
  applyCreatedRange(filter, query);
  if (query.status) filter.band = query.status;

  if (req.user.role === 'student') {
    filter.user = req.user._id;
  } else if (query.userId) {
    filter.user = query.userId;
  }

  const [tests, total] = await Promise.all([
    Test.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role')
      .populate('location', 'name building floor currentStatus'),
    Test.countDocuments(filter),
  ]);

  res.json({ ok: true, tests: tests.map(presentTest), ...pageMeta(total, page, limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.validated.params.id)
    .populate('user', 'name email role')
    .populate('location', 'name building floor currentStatus');
  if (!test) throw new ApiError(404, 'Test not found');
  if (req.user.role === 'student' && !ownsRecord(req.user, test.user)) {
    throw new ApiError(404, 'Test not found');
  }
  res.json({ ok: true, test: presentTest(test) });
});

module.exports = { create, list, getOne };
