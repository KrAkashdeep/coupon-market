const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    // Stripe fields
    stripePaymentIntentId: {
        type: String,
        default: null
    },
    stripeRefundId: {
        type: String,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'holding', 'completed', 'failed', 'released', 'refunded'],
        default: 'pending'
    },
    buyerConfirmation: {
        type: Boolean,
        default: false
    },
    disputeReason: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true,
        default: function () {
            // Set expiry to 15 minutes from creation
            return new Date(Date.now() + 15 * 60 * 1000);
        }
    },
    completedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
transactionSchema.index({ buyerId: 1 });
transactionSchema.index({ sellerId: 1 });
transactionSchema.index({ couponId: 1 }, { unique: true });
transactionSchema.index({ paymentStatus: 1 });
transactionSchema.index({ expiresAt: 1 });
transactionSchema.index({ stripePaymentIntentId: 1 });

// Method to check if transaction verification period has expired
transactionSchema.methods.isExpired = function () {
    return this.expiresAt < new Date();
};

// Method to auto-confirm transaction when timer expires
transactionSchema.methods.autoConfirm = async function () {
    if (this.paymentStatus !== 'holding') {
        throw new Error('Transaction must be in holding status to auto-confirm');
    }

    this.paymentStatus = 'released';
    this.buyerConfirmation = true;
    this.completedAt = new Date();

    await this.save();
    return this;
};

// Method to release payment to seller (buyer confirms working)
transactionSchema.methods.release = async function () {
    if (this.paymentStatus !== 'holding') {
        throw new Error('Transaction must be in holding status to release');
    }

    this.paymentStatus = 'released';
    this.buyerConfirmation = true;
    this.completedAt = new Date();

    await this.save();
    return this;
};

// Method to refund payment to buyer (dispute)
transactionSchema.methods.refund = async function (reason = null) {
    if (this.paymentStatus !== 'holding') {
        throw new Error('Transaction must be in holding status to refund');
    }

    this.paymentStatus = 'refunded';
    this.disputeReason = reason;
    this.completedAt = new Date();

    await this.save();
    return this;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
