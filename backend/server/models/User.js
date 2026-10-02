const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_STATUSES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    passwordHash: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'student', required: true },
    accountStatus: { type: String, enum: ACCOUNT_STATUSES, default: 'active', required: true },
  },
  { timestamps: true }
);

userSchema.pre('validate', function copyPassword(next) {
  if (!this.passwordHash && this.password) this.passwordHash = this.password;
  if (!this.password && this.passwordHash) this.password = this.passwordHash;
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  try {
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 10);
      this.passwordHash = this.password;
    } else if (this.isModified('passwordHash')) {
      const hashed = typeof this.passwordHash === 'string' && this.passwordHash.startsWith('$2');
      if (!hashed) this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
      this.password = this.passwordHash;
    }
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

function hidePassword(_doc, ret) {
  delete ret.password;
  delete ret.passwordHash;
  delete ret.__v;
  return ret;
}

userSchema.set('toJSON', { transform: hidePassword });
userSchema.set('toObject', { transform: hidePassword });

module.exports = mongoose.model('User', userSchema);
