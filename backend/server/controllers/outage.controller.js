const Outage = require('../models/Outage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { presentOutage } = require('../utils/present');
const { getPaging, pageMeta } = require('../utils/pagination');
const { applyLocationFilters } = require('../utils/filters');
const { logActivity } = require('../services/activity.service');
const { normalizedType } = require('../utils/text');

const POPULATE = [{ path: 'location', select: 'name building floor currentStatus' }];

const list = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPaging(query);
  const filter = {};
  await applyLocationFilters(filter, query);
  if (query.status) filter.status = query.status;
  if (query.type) filter.normalizedType = normalizedType(query.type);

  const [outages, total] = await Promise.all([
    Outage.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit).populate(POPULATE),
    Outage.countDocuments(filter),
  ]);

  res.json({ ok: true, outages: outages.map(presentOutage), ...pageMeta(total, page, limit) });
});

const update = asyncHandler(async (req, res) => {
  const outage = await Outage.findById(req.validated.params.id);
  if (!outage) throw new ApiError(404, 'Outage not found');

  const { status } = req.validated.body;
  if (outage.status !== status) {
    const from = outage.status;
    outage.status = status;
    if (status === 'resolved') {
      outage.resolvedAt = new Date();
      outage.resolvedReason = 'manual';
    } else {
      outage.resolvedAt = null;
      outage.resolvedReason = null;
    }
    try {
      await outage.save();
    } catch (err) {
      if (err.code === 11000) {
        throw new ApiError(409, 'An active outage already exists for this location and type');
      }
      throw err;
    }
    await logActivity(req.user._id, 'status_change', 'Outage', outage._id, { from, to: status });
  }

  await outage.populate(POPULATE);
  res.json({ ok: true, outage: presentOutage(outage) });
});

module.exports = { list, update };
