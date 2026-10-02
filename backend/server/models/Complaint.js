const mongoose = require('mongoose');
const { COMPLAINT_STATUSES, COMPLAINT_CATEGORIES, SEVERITIES } = require('../utils/constants');

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
    type: { type: String, enum: COMPLAINT_CATEGORIES, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    severity: { type: String, enum: SEVERITIES, default: 'medium', required: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'Submitted', required: true, index: true },
    relatedTest: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: [noteSchema], default: [] },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

function syncComplaint(doc) {
  if (doc.assignedTo && !doc.assignedStaff) doc.assignedStaff = doc.assignedTo;
  if (doc.assignedStaff && !doc.assignedTo) doc.assignedTo = doc.assignedStaff;
  if (doc.status === 'Resolved' && !doc.resolvedAt) doc.resolvedAt = new Date();
}

complaintSchema.pre('validate', function syncComplaintFields(next) {
  syncComplaint(this);
  next();
});

complaintSchema.pre('save', function syncComplaintOnSave(next) {
  if (this.assignedTo) this.assignedStaff = this.assignedTo;
  else if (this.assignedStaff) this.assignedTo = this.assignedStaff;
  if (this.status === 'Resolved') {
    if (!this.resolvedAt) this.resolvedAt = new Date();
  } else if (this.isModified('status')) {
    this.resolvedAt = null;
  }
  next();
});

complaintSchema.pre('insertMany', function syncComplaintBatch(next, docs) {
  docs.forEach(syncComplaint);
  next();
});

complaintSchema.index({ location: 1, type: 1, createdAt: -1 });
complaintSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
