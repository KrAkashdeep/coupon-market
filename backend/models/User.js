const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  totalCouponsSold: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCouponsBought: {
    type: Number,
    default: 0,
    min: 0
  },
  trustScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
    validate: {
      validator: function (v) {
        return v >= 0 && v <= 100;
      },
      message: 'Trust score must be between 0 and 100'
    }
  },
  warningsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ trustScore: -1 });

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to calculate trust score based on warnings count
userSchema.statics.calculateTrustScore = function (warningsCount) {
  // Formula: 100 - (warningsCount * 10)
  const calculatedScore = 100 - (warningsCount * 10);
  // Ensure score stays between 0 and 100
  return Math.max(0, Math.min(100, calculatedScore));
};

// Method to update trust score based on warnings
userSchema.methods.updateTrustScore = function () {
  // Use the static method to calculate the score
  this.trustScore = this.constructor.calculateTrustScore(this.warningsCount);
  return this.trustScore;
};

// Method to increment warnings and check ban conditions
userSchema.methods.incrementWarnings = async function () {
  this.warningsCount += 1;
  this.updateTrustScore();

  // Auto-ban if warnings >= 3 or trust score < 20
  if (this.warningsCount >= 3 || this.trustScore < 20) {
    this.isBanned = true;
  }

  await this.save();
  return this;
};

// Method to get trust badge based on score and warnings
userSchema.methods.getTrustBadge = function () {
  if (this.warningsCount >= 2) {
    return 'Warning Flag';
  }
  if (this.trustScore > 90) {
    return 'Gold Seller';
  }
  if (this.trustScore >= 70) {
    return 'Verified Seller';
  }
  return 'New Seller';
};

const User = mongoose.model('User', userSchema);

module.exports = User;
