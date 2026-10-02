const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');

function presentNotification(entry) {
  return {
    id: entry._id,
    title: entry.title,
    body: entry.body,
    kind: entry.kind,
    entity: entry.entity || '',
    entityId: entry.entityId || null,
    read: Boolean(entry.read),
    createdAt: entry.createdAt,
  };
}

const list = asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPaging(query);
  const filter = { user: req.user._id };
  if (query.unread === 'true') filter.read = false;
  if (query.unread === 'false') filter.read = true;

  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({
    ok: true,
    notifications: notifications.map(presentNotification),
    unread,
    ...pageMeta(total, page, limit),
  });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.validated.params.id,
    user: req.user._id,
  });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.json({ ok: true, notification: presentNotification(notification) });
});

const markAll = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );
  res.json({ ok: true, updated: result.modifiedCount || 0 });
});

module.exports = { list, markRead, markAll };
