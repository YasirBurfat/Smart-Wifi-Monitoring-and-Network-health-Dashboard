const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { publicUser } = require('../utils/publicUser');
const { getPaging, pageMeta } = require('../utils/pagination');
const { logActivity } = require('../services/activity.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaging(req.validated.query);
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  res.json({ ok: true, users: users.map(publicUser), ...pageMeta(total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role, accountStatus } = req.validated.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'A user with that email already exists');

  const user = await User.create({
    name,
    email,
    password,
    role,
    accountStatus: accountStatus || 'active',
  });
  await logActivity(req.user._id, 'create', 'User', user._id, { role: user.role, email: user.email });
  res.status(201).json({ ok: true, user: publicUser(user) });
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.validated.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const { role, accountStatus } = req.validated.body;
  const previous = { role: user.role, accountStatus: user.accountStatus };
  let roleChanged = false;
  let statusChanged = false;

  if (role !== undefined && role !== user.role) {
    user.role = role;
    roleChanged = true;
  }
  if (accountStatus !== undefined && accountStatus !== user.accountStatus) {
    user.accountStatus = accountStatus;
    statusChanged = true;
  }

  if (roleChanged || statusChanged) {
    await user.save();
  }
  if (roleChanged) {
    await logActivity(req.user._id, 'role_change', 'User', user._id, {
      from: previous.role,
      to: user.role,
    });
  }
  if (statusChanged) {
    await logActivity(req.user._id, 'status_change', 'User', user._id, {
      from: previous.accountStatus,
      to: user.accountStatus,
    });
  }

  res.json({ ok: true, user: publicUser(user) });
});

module.exports = { list, create, update };
