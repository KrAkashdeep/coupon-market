const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountPercent: {
    type: Number,
    min: 1,
    max: 100,
    default: null
  },
  discountAmount: {
    type: Number,
    min: 1,
    default: null
  },
  expiryDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isSold: {
    type: Boolean,
    default: false
  },
  // Verification fields
  screenshotURL: {
    type: String,
    default: null
  },
  ocrExtractedCode: {
    type: String,
    default: null
  },
  isOCRMatched: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending_verification', 'rejected', 'approved', 'sold'],
    default: 'pending_verification'
  },
  adminNotes: {
    type: String,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Virtual field to check if coupon is expired
couponSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

// Ensure virtuals are included when converting to JSON
couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

// Add indexes for performance
couponSchema.index({ sellerId: 1 });
couponSchema.index({ status: 1 });
couponSchema.index({ isSold: 1 });
couponSchema.index({ status: 1, isSold: 1 }); // Compound index

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
