const mongoose = require('mongoose');

const ACTIONS = ['create', 'update', 'delete', 'status_change', 'role_change'];
const ENTITIES = ['User', 'Location', 'Test', 'Complaint', 'Outage', 'Setting', 'Notification'];

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ACTIONS, required: true, trim: true, index: true },
    entity: { type: String, enum: ENTITIES, required: true, trim: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
