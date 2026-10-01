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

module.exports = { getSettings };
