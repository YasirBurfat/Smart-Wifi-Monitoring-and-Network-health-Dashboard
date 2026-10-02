const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');

function presentLog(entry) {
  const actor = entry.actor && entry.actor.email
    ? {
      id: entry.actor._id,
      name: entry.actor.name,
      email: entry.actor.email,
      role: entry.actor.role,
    }
    : { id: entry.actor?._id || entry.actor || null };
  return {
    id: entry._id,
    actor,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    meta: entry.meta || {},
    createdAt: entry.createdAt,
  };
}

const list = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPaging(query);
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entity) filter.entity = query.entity;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name email role'),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ ok: true, logs: logs.map(presentLog), ...pageMeta(total, page, limit) });
});

module.exports = { list };
