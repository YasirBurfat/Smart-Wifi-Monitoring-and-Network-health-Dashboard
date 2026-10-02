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
    minComplaints: { type: Number, required: true, default: DEFAULT_OUTAGE_RULE.minComplaints, min: 1 },
    windowMinutes: { type: Number, required: true, default: DEFAULT_OUTAGE_RULE.windowMinutes, min: 1 },
  },
  { _id: false }
);

const weightSchema = new mongoose.Schema(
  {
    download: { type: Number, required: true, default: 30, min: 0 },
    upload: { type: Number, required: true, default: 15, min: 0 },
    ping: { type: Number, required: true, default: 25, min: 0 },
    packetLoss: { type: Number, required: true, default: 20, min: 0 },
    stability: { type: Number, required: true, default: 10, min: 0 },
  },
  { _id: false }
);

const DEFAULT_WEIGHTS = {
  download: 30,
  upload: 15,
  ping: 25,
  packetLoss: 20,
  stability: 10,
};

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    thresholds: { type: thresholdSchema, required: true, default: () => ({ ...DEFAULT_THRESHOLDS }) },
    weights: { type: weightSchema, required: true, default: () => ({ ...DEFAULT_WEIGHTS }) },
    outageRule: { type: outageRuleSchema, required: true, default: () => ({ ...DEFAULT_OUTAGE_RULE }) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
