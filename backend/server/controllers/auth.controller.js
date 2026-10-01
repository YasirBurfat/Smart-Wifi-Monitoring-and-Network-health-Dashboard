const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { publicUser } = require('../utils/publicUser');
const { signToken } = require('../utils/tokens');
const { logActivity } = require('../services/activity.service');

let dummyHashPromise;

function dummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('not-a-real-account-password', 10);
  }
  return dummyHashPromise;
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'A user with that email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'student',
    accountStatus: 'active',
  });

  await logActivity(user._id, 'create', 'User', user._id, { role: 'student', source: 'register' });
  res.status(201).json({ ok: true, token: signToken(user), user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email }).select('+password');
  const hash = user ? user.password : await dummyHash();
  const matches = await bcrypt.compare(password, hash);

  if (!user || !matches) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled');
  }

  res.json({ ok: true, token: signToken(user), user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) });
});

module.exports = { register, login, me };
