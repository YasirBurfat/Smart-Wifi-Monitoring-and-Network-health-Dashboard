const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_STATUSES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'student', required: true },
    accountStatus: { type: String, enum: ACCOUNT_STATUSES, default: 'active', required: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

function hidePassword(_doc, ret) {
  delete ret.password;
  delete ret.__v;
  return ret;
}

userSchema.set('toJSON', { transform: hidePassword });
userSchema.set('toObject', { transform: hidePassword });

module.exports = mongoose.model('User', userSchema);
