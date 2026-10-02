const Setting = require('../models/Setting');
const { DEFAULT_THRESHOLDS, DEFAULT_OUTAGE_RULE } = require('../utils/constants');

function plain(value, fallback) {
  if (!value) return { ...fallback };
  const source = typeof value.toObject === 'function' ? value.toObject() : value;
  return { ...fallback, ...source };
}

async function getSettings() {
  let doc = await Setting.findOne({ key: 'default' });
  if (!doc) {
    try {
      doc = await Setting.create({
        key: 'default',
        thresholds: { ...DEFAULT_THRESHOLDS },
        outageRule: { ...DEFAULT_OUTAGE_RULE },
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      doc = await Setting.findOne({ key: 'default' });
    }
  }

  return {
    id: doc._id,
    thresholds: plain(doc.thresholds, DEFAULT_THRESHOLDS),
    outageRule: plain(doc.outageRule, DEFAULT_OUTAGE_RULE),
  };
}

async function updateSettings(patch, actorId) {
  const { logActivity } = require('./activity.service');
  const current = await getSettings();
  const thresholds = {};
  for (const key of Object.keys(DEFAULT_THRESHOLDS)) {
    const incoming = patch.thresholds && Object.prototype.hasOwnProperty.call(patch.thresholds, key)
      ? patch.thresholds[key]
      : current.thresholds[key];
    thresholds[key] = incoming;
  }
  const outageRule = {
    minComplaints: patch.outageRule?.minComplaints ?? current.outageRule.minComplaints,
    windowMinutes: patch.outageRule?.windowMinutes ?? current.outageRule.windowMinutes,
  };

  let doc = await Setting.findOne({ key: 'default' });
  if (!doc) {
    doc = await Setting.create({ key: 'default', thresholds, outageRule });
  } else {
    doc.thresholds = thresholds;
    doc.outageRule = outageRule;
    doc.markModified('thresholds');
    doc.markModified('outageRule');
    await doc.save();
  }

  await logActivity(actorId, 'update', 'Setting', doc._id, {
    thresholds,
    outageRule,
  });

  const { refreshLocationStatus } = require('./health.service');
  const Location = require('../models/Location');
  const locations = await Location.find().select('_id');
  const refreshed = [];
  for (const location of locations) {
    const next = await refreshLocationStatus(location._id, actorId);
    if (next) {
      refreshed.push({
        id: next._id,
        name: next.name,
        currentStatus: next.currentStatus,
      });
    }
  }

  return {
    settings: await getSettings(),
    locations: refreshed,
  };
}

module.exports = { getSettings, updateSettings };
