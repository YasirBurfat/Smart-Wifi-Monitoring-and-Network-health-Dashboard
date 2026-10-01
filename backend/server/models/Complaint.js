const mongoose = require('mongoose');
const { COMPLAINT_STATUSES } = require('../utils/constants');

const noteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'Submitted', index: true },
    relatedTest: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: [noteSchema], default: [] },
  },
  { timestamps: true }
);

complaintSchema.index({ location: 1, type: 1, createdAt: -1 });
complaintSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
