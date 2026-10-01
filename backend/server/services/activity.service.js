const ActivityLog = require('../models/ActivityLog');

async function logActivity(actor, action, entity, entityId, meta = {}) {
  const actorId = actor && actor._id ? actor._id : actor;
  if (!actorId) {
    throw new Error('logActivity requires an actor');
  }
  return ActivityLog.create({
    actor: actorId,
    action,
    entity,
    entityId,
    meta,
  });
}

module.exports = { logActivity };
