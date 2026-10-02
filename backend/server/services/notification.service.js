const Notification = require('../models/Notification');
const User = require('../models/User');
const { STAFF_ROLES } = require('../utils/constants');

async function notifyUser(userId, payload) {
  if (!userId) return null;
  return Notification.create({
    user: userId,
    title: payload.title,
    body: payload.body,
    kind: payload.kind,
    entity: payload.entity || '',
    entityId: payload.entityId || null,
    read: false,
  });
}

async function notifyStaff(payload) {
  const staff = await User.find({
    role: { $in: STAFF_ROLES },
    accountStatus: 'active',
  }).select('_id');
  if (!staff.length) return [];
  return Notification.insertMany(staff.map((user) => ({
    user: user._id,
    title: payload.title,
    body: payload.body,
    kind: payload.kind,
    entity: payload.entity || '',
    entityId: payload.entityId || null,
    read: false,
  })));
}

async function safeNotify(work) {
  try {
    await work();
  } catch (err) {
    console.error('Notification write failed');
    console.error(err.message);
  }
}

module.exports = { notifyUser, notifyStaff, safeNotify };
