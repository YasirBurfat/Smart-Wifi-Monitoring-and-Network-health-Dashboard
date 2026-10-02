const Complaint = require('../models/Complaint');
const Outage = require('../models/Outage');
const { getSettings } = require('./setting.service');
const { logActivity } = require('./activity.service');
const { HEALTHY_BANDS } = require('../utils/constants');
const { exactTypeFilter, normalizedType } = require('../utils/text');

async function evaluateOutage(complaint, actorId) {
  const settings = await getSettings();
  const minComplaints = settings.outageRule.minComplaints;
  const windowMinutes = settings.outageRule.windowMinutes;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const typeKey = normalizedType(complaint.type);

  const count = await Complaint.countDocuments({
    location: complaint.location,
    type: exactTypeFilter(complaint.type),
    createdAt: { $gte: since },
  });

  if (count < minComplaints) return null;

  const existing = await Outage.findOne({
    location: complaint.location,
    normalizedType: typeKey,
    status: 'active',
  });

  if (existing) {
    if (existing.complaintCount !== count) {
      existing.complaintCount = count;
      await existing.save();
      await logActivity(actorId, 'update', 'Outage', existing._id, {
        complaintCount: count,
        type: complaint.type,
        location: complaint.location,
      });
      try {
        const { notifyStaff } = require('./notification.service');
        await notifyStaff({
          title: 'Outage updated',
          body: `${complaint.type} is now ${count} complaints in ${windowMinutes} minutes.`,
          kind: 'outage',
          entity: 'Outage',
          entityId: existing._id,
        });
      } catch (err) {
        console.error('Failed to write outage notification');
      }
    }
    return existing;
  }

  try {
    const outage = await Outage.create({
      location: complaint.location,
      type: complaint.type,
      normalizedType: typeKey,
      status: 'active',
      complaintCount: count,
      startedAt: new Date(),
    });
    await logActivity(actorId, 'create', 'Outage', outage._id, {
      type: complaint.type,
      location: complaint.location,
      complaintCount: count,
      windowMinutes,
    });
    try {
      const { notifyStaff } = require('./notification.service');
      await notifyStaff({
        title: 'Outage opened',
        body: `${complaint.type} reached ${count} complaints in ${windowMinutes} minutes.`,
        kind: 'outage',
        entity: 'Outage',
        entityId: outage._id,
      });
    } catch (err) {
      console.error('Failed to write outage notification');
    }
    return outage;
  } catch (err) {
    if (err.code !== 11000) throw err;
    return Outage.findOne({
      location: complaint.location,
      normalizedType: typeKey,
      status: 'active',
    });
  }
}

async function resolveIfHealthy(location, actorId) {
  if (!location || !HEALTHY_BANDS.includes(location.currentStatus)) return [];

  const active = await Outage.find({ location: location._id, status: 'active' });
  const resolved = [];
  for (const outage of active) {
    outage.status = 'resolved';
    outage.resolvedAt = new Date();
    outage.resolvedReason = 'location_health_recovered';
    await outage.save();
    await logActivity(actorId, 'status_change', 'Outage', outage._id, {
      from: 'active',
      to: 'resolved',
      reason: 'location_health_recovered',
      currentStatus: location.currentStatus,
    });
    resolved.push(outage);
  }
  return resolved;
}

module.exports = { evaluateOutage, resolveIfHealthy };
