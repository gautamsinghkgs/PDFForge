const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: v => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v),
        message: 'Password must contain uppercase, lowercase, and a number',
      },
      select: false,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    avatar: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    tasksToday: {
      type: Number,
      default: 0,
    },
    lastTaskDate: {
      type: Date,
      default: null,
    },
    storageUsed: {
      type: Number, // in bytes
      default: 0,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'expired', 'cancelled', null],
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Hash password before saving ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password method ──
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Reset daily task counter ──
userSchema.methods.checkDailyReset = function () {
  const today = new Date().toDateString();
  const lastDate = this.lastTaskDate ? new Date(this.lastTaskDate).toDateString() : null;
  if (today !== lastDate) {
    this.tasksToday = 0;
    this.lastTaskDate = new Date();
  }
};

// ── Check if subscription expired, downgrade to free ──
userSchema.methods.checkSubscription = function () {
  if (this.plan === 'free') return;
  if (this.subscriptionStatus === 'expired' ||
      (this.subscriptionEndDate && this.subscriptionEndDate < new Date())) {
    this.plan = 'free';
    this.subscriptionStatus = 'expired';
  }
};

// ── Task limits by plan ──
userSchema.methods.canRunTask = function () {
  this.checkDailyReset();
  this.checkSubscription();
  const limits = { free: 10, pro: 100, enterprise: Infinity };
  return this.tasksToday < (limits[this.plan] || 10);
};

module.exports = mongoose.model('User', userSchema);
