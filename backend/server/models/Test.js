const mongoose = require('mongoose');
const { BANDS } = require('../utils/constants');

const componentSchema = new mongoose.Schema(
  {
    download: { type: Number, default: 0 },
    upload: { type: Number, default: 0 },
    ping: { type: Number, default: 0 },
    packetLoss: { type: Number, default: 0 },
    stability: { type: Number, default: 0 },
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    download: { type: Number, required: true, min: 0 },
    upload: { type: Number, required: true, min: 0 },
    ping: { type: Number, required: true, min: 0 },
    jitter: { type: Number, required: true, min: 0, default: 0 },
    packetLoss: { type: Number, required: true, min: 0 },
    score: { type: Number, required: true },
    healthScore: { type: Number, required: true },
    band: { type: String, enum: BANDS, required: true },
    healthStatus: { type: String, enum: BANDS, required: true },
    testedAt: { type: Date, required: true, default: Date.now },
    components: { type: componentSchema, default: () => ({}) },
    recentFailures: { type: Number, default: 0 },
    recentComplaints: { type: Number, default: 0 },
    trendMessage: { type: String, default: null },
    problemFlag: { type: String, default: null },
  },
  { timestamps: true }
);

function syncSpeedTest(doc) {
  if (doc.score == null && doc.healthScore != null) doc.score = doc.healthScore;
  if (doc.healthScore == null && doc.score != null) doc.healthScore = doc.score;
  if (!doc.band && doc.healthStatus) doc.band = doc.healthStatus;
  if (!doc.healthStatus && doc.band) doc.healthStatus = doc.band;
  if (doc.jitter == null) doc.jitter = 0;
  if (!doc.testedAt) doc.testedAt = doc.createdAt || new Date();
}

testSchema.pre('validate', function syncSpeedTestFields(next) {
  syncSpeedTest(this);
  next();
});

testSchema.pre('insertMany', function syncSpeedTestBatch(next, docs) {
  docs.forEach(syncSpeedTest);
  next();
});

testSchema.index({ location: 1, testedAt: -1 });
testSchema.index({ location: 1, createdAt: -1 });
testSchema.index({ user: 1, createdAt: -1 });
testSchema.index({ band: 1, createdAt: -1 });

module.exports = mongoose.model('Test', testSchema);
