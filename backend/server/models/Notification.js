const mongoose = require('mongoose');
const { ROLES } = require('../utils/constants');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      validate: {
        validator(value) {
          return Boolean(value || this.role);
        },
        message: 'user or role is required',
      },
    },
    role: { type: String, enum: ROLES },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    kind: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, required: true, trim: true, maxlength: 40 },
    entity: { type: String, trim: true, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

function syncNotification(doc) {
  if (!doc.type) doc.type = doc.kind || 'system';
  if (!doc.kind) doc.kind = doc.type;
  if (!doc.message) doc.message = doc.body || doc.title || 'Notification';
  if (!doc.body) doc.body = doc.message;
  if (!doc.title) doc.title = String(doc.message).slice(0, 160);
  if (doc.read == null) doc.read = false;
}

notificationSchema.pre('validate', function syncNotificationFields(next) {
  syncNotification(this);
  next();
});

notificationSchema.pre('insertMany', function syncNotificationBatch(next, docs) {
  for (const doc of docs) {
    syncNotification(doc);
    if (!doc.user && !doc.role) {
      next(new Error('Notification requires a user or a role'));
      return;
    }
  }
  next();
});

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
