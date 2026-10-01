const mongoose = require('mongoose');
const { LOCATION_STATUSES } = require('../utils/constants');

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    building: { type: String, required: true, trim: true, maxlength: 120 },
    floor: { type: String, trim: true, default: '', maxlength: 40 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    currentStatus: { type: String, enum: LOCATION_STATUSES, default: 'Unknown' },
    mapPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

locationSchema.index({ building: 1, name: 1 });

module.exports = mongoose.model('Location', locationSchema);
