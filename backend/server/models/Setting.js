const mongoose = require('mongoose');
const { DEFAULT_THRESHOLDS, DEFAULT_OUTAGE_RULE } = require('../utils/constants');

const thresholdSchema = new mongoose.Schema(
  {
    downloadMbps: { type: Number, default: DEFAULT_THRESHOLDS.downloadMbps },
    downloadPoints: { type: Number, default: DEFAULT_THRESHOLDS.downloadPoints },
    uploadMbps: { type: Number, default: DEFAULT_THRESHOLDS.uploadMbps },
    uploadPoints: { type: Number, default: DEFAULT_THRESHOLDS.uploadPoints },
    pingGoodMs: { type: Number, default: DEFAULT_THRESHOLDS.pingGoodMs },
    pingBadMs: { type: Number, default: DEFAULT_THRESHOLDS.pingBadMs },
    pingPoints: { type: Number, default: DEFAULT_THRESHOLDS.pingPoints },
    packetLossPercent: { type: Number, default: DEFAULT_THRESHOLDS.packetLossPercent },
    packetLossPoints: { type: Number, default: DEFAULT_THRESHOLDS.packetLossPoints },
    stabilityPoints: { type: Number, default: DEFAULT_THRESHOLDS.stabilityPoints },
    failurePenalty: { type: Number, default: DEFAULT_THRESHOLDS.failurePenalty },
    complaintPenalty: { type: Number, default: DEFAULT_THRESHOLDS.complaintPenalty },
    excellentMin: { type: Number, default: DEFAULT_THRESHOLDS.excellentMin },
    goodMin: { type: Number, default: DEFAULT_THRESHOLDS.goodMin },
    fairMin: { type: Number, default: DEFAULT_THRESHOLDS.fairMin },
    poorMin: { type: Number, default: DEFAULT_THRESHOLDS.poorMin },
  },
  { _id: false }
);

const outageRuleSchema = new mongoose.Schema(
  {
    minComplaints: { type: Number, default: DEFAULT_OUTAGE_RULE.minComplaints },
    windowMinutes: { type: Number, default: DEFAULT_OUTAGE_RULE.windowMinutes },
  },
  { _id: false }
);

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    thresholds: { type: thresholdSchema, default: () => ({ ...DEFAULT_THRESHOLDS }) },
    outageRule: { type: outageRuleSchema, default: () => ({ ...DEFAULT_OUTAGE_RULE }) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
