const mongoose = require('mongoose');
const { OUTAGE_STATUSES } = require('../utils/constants');

const outageSchema = new mongoose.Schema(
  {
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    type: { type: String, required: true, trim: true },
    normalizedType: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: OUTAGE_STATUSES, default: 'active', index: true },
    complaintCount: { type: Number, required: true, min: 1 },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    resolvedReason: { type: String, default: null },
  },
  { timestamps: true }
);

outageSchema.index(
  { location: 1, normalizedType: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

module.exports = mongoose.model('Outage', outageSchema);
