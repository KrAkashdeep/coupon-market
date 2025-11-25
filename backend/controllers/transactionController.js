const Transaction = require('../models/Transaction');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Create a new transaction (purchase coupon)
const createTransaction = async (req, res, next) => {
    try {
        const { couponId } = req.body;
        const buyerId = req.user?.id;

        console.log('🔵 createTransaction called');
        console.log('  couponId:', couponId);
        console.log('  buyerId:', buyerId);

        // Validate couponId is provided
        if (!couponId) {
            console.error('❌ Missing couponId');
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Coupon ID is required'
                }
            });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid coupon ID format'
                }
            });
        }

        // Find the coupon
        const coupon = await Coupon.findById(couponId).populate('sellerId', 'name email');

        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COUPON_NOT_FOUND',
                    message: 'Coupon not found'
                }
            });
        }

        // Verify coupon is approved
        if (coupon.status !== 'approved') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Coupon must be approved to purchase'
                }
            });
        }

        // Verify coupon is not sold
        if (coupon.isSold) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_SOLD',
                    message: 'Coupon has already been sold'
                }
            });
        }

        // Verify coupon is not expired
        if (coupon.expiryDate < new Date()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'COUPON_EXPIRED',
                    message: 'Coupon has expired'
                }
            });
        }

        // Verify buyer is not the seller
        if (coupon.sellerId._id.toString() === req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You cannot purchase your own coupon'
                }
            });
        }

        // Create transaction with paymentStatus 'holding'
        const transaction = new Transaction({
            buyerId: req.user.id,
            sellerId: coupon.sellerId._id,
            couponId: coupon._id,
            amount: coupon.price,
            paymentStatus: 'holding',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
        });

        console.log('💾 Saving transaction...');
        await transaction.save();
        console.log('✅ Transaction saved:', transaction._id);

        // Update coupon: set isSold to true and set buyerId
        coupon.isSold = true;
        coupon.buyerId = req.user.id;
        await coupon.save();

        // Increment seller's totalCouponsSold
        await User.findByIdAndUpdate(coupon.sellerId._id, {
            $inc: { totalCouponsSold: 1 }
        });

        // Increment buyer's totalCouponsBought
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalCouponsBought: 1 }
        });

        // Create notification for buyer
        await Notification.create({
            userId: req.user.id,
            type: 'purchase',
            title: 'Purchase Successful',
            message: `You have successfully purchased the coupon "${coupon.storeName} - ${coupon.code}". You have 15 minutes to verify it works.`,
            relatedId: transaction._id
        });

        // Create notification for seller
        await Notification.create({
            userId: coupon.sellerId._id,
            type: 'sale',
            title: 'Coupon Sold',
            message: `Your coupon "${coupon.storeName} - ${coupon.code}" has been sold. Payment is being held in escrow.`,
            relatedId: transaction._id
        });

        // Return transaction with revealed coupon code
        console.log('📤 Sending success response for transaction:', transaction._id);
        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            transaction: {
                id: transaction._id,
                couponCode: coupon.code,
                amount: transaction.amount,
                paymentStatus: transaction.paymentStatus,
                expiresAt: transaction.expiresAt,
                createdAt: transaction.createdAt,
                coupon: {
                    id: coupon._id,
                    brand: coupon.storeName,
                    expiryDate: coupon.expiryDate,
                    screenshotURL: coupon.screenshotURL
                }
            }
        });
        console.log('✅ Response sent successfully');
    } catch (error) {
        console.error('Create transaction error:', error);
        next(error);
    }
};

// Confirm transaction (buyer confirms coupon works)
const confirmTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid transaction ID format'
                }
            });
        }

        // Find the transaction
        const transaction = await Transaction.findById(id)
            .populate('couponId')
            .populate('sellerId', 'name email trustScore')
            .populate('buyerId', 'name email');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Transaction not found'
                }
            });
        }

        // Verify transaction belongs to authenticated buyer
        if (transaction.buyerId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to confirm this transaction'
                }
            });
        }

        // Check transaction is not expired
        if (transaction.isExpired()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TRANSACTION_EXPIRED',
                    message: 'Transaction verification period has expired'
                }
            });
        }

        // Check paymentStatus is 'holding'
        if (transaction.paymentStatus !== 'holding') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: `Transaction must be in holding status to confirm. Current status: ${transaction.paymentStatus}`
                }
            });
        }

        // Release payment using transaction method
        await transaction.release();

        // Update coupon status to 'sold'
        await Coupon.findByIdAndUpdate(transaction.couponId._id, {
            status: 'sold'
        });

        // Increase seller trustScore by 5 points
        const seller = await User.findById(transaction.sellerId._id);
        seller.trustScore = Math.min(100, seller.trustScore + 5);
        await seller.save();

        // Create success notification for buyer
        await Notification.create({
            userId: transaction.buyerId._id,
            type: 'purchase',
            title: 'Transaction Confirmed',
            message: `You have confirmed the coupon "${transaction.couponId.storeName} - ${transaction.couponId.code}" works. Payment has been released to the seller.`,
            relatedId: transaction._id
        });

        // Create success notification for seller
        await Notification.create({
            userId: transaction.sellerId._id,
            type: 'sale',
            title: 'Payment Released',
            message: `The buyer confirmed your coupon "${transaction.couponId.storeName} - ${transaction.couponId.code}" works. Payment has been released to you.`,
            relatedId: transaction._id
        });

        res.status(200).json({
            success: true,
            message: 'Transaction confirmed successfully',
            transaction: {
                id: transaction._id,
                paymentStatus: transaction.paymentStatus,
                buyerConfirmation: transaction.buyerConfirmation,
                completedAt: transaction.completedAt,
                seller: {
                    name: seller.name,
                    trustScore: seller.trustScore
                }
            }
        });
    } catch (error) {
        console.error('Confirm transaction error:', error);
        next(error);
    }
};

// Dispute transaction (buyer reports coupon not working)
const disputeTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { disputeReason } = req.body;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid transaction ID format'
                }
            });
        }

        // Validate dispute reason is provided
        if (!disputeReason || disputeReason.trim() === '') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Dispute reason is required'
                }
            });
        }

        // Find the transaction
        const transaction = await Transaction.findById(id)
            .populate('couponId')
            .populate('sellerId', 'name email trustScore warningsCount')
            .populate('buyerId', 'name email');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Transaction not found'
                }
            });
        }

        // Verify transaction belongs to authenticated buyer
        if (transaction.buyerId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to dispute this transaction'
                }
            });
        }

        // Check transaction is not expired
        if (transaction.isExpired()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TRANSACTION_EXPIRED',
                    message: 'Transaction verification period has expired'
                }
            });
        }

        // Check paymentStatus is 'holding'
        if (transaction.paymentStatus !== 'holding') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: `Transaction must be in holding status to dispute. Current status: ${transaction.paymentStatus}`
                }
            });
        }

        // Refund payment using transaction method
        await transaction.refund(disputeReason.trim());

        // Update coupon: set isSold back to false and clear buyerId
        await Coupon.findByIdAndUpdate(transaction.couponId._id, {
            isSold: false,
            buyerId: null
        });

        // Get seller and decrease trustScore by 50 points
        const seller = await User.findById(transaction.sellerId._id);
        seller.trustScore = Math.max(0, seller.trustScore - 50);

        // Check if seller will be banned before incrementing warnings
        const wasBanned = seller.isBanned;

        // Increment seller warningsCount
        await seller.incrementWarnings();

        // Create notification for buyer (refund)
        await Notification.create({
            userId: transaction.buyerId._id,
            type: 'purchase',
            title: 'Refund Processed',
            message: `Your dispute for coupon "${transaction.couponId.storeName} - ${transaction.couponId.code}" has been processed. You have been refunded.`,
            relatedId: transaction._id
        });

        // Create notification for seller (dispute)
        await Notification.create({
            userId: transaction.sellerId._id,
            type: 'warning',
            title: 'Dispute Filed',
            message: `A buyer has disputed your coupon "${transaction.couponId.storeName} - ${transaction.couponId.code}". Reason: ${disputeReason.trim()}. Your trust score has been decreased.`,
            relatedId: transaction._id
        });

        // Create ban notification if user was just banned
        if (!wasBanned && seller.isBanned) {
            const { notifyBan } = require('../utils/notificationHelper');
            await notifyBan(seller._id, 'multiple buyer disputes', true);
        }

        // Check if seller should be banned
        const banMessage = seller.isBanned ? ' The seller has been banned due to multiple violations.' : '';

        res.status(200).json({
            success: true,
            message: `Transaction disputed and refunded successfully.${banMessage}`,
            transaction: {
                id: transaction._id,
                paymentStatus: transaction.paymentStatus,
                disputeReason: transaction.disputeReason,
                completedAt: transaction.completedAt,
                seller: {
                    name: seller.name,
                    trustScore: seller.trustScore,
                    warningsCount: seller.warningsCount,
                    isBanned: seller.isBanned
                }
            }
        });
    } catch (error) {
        console.error('Dispute transaction error:', error);
        next(error);
    }
};

// Get user's transactions (both as buyer and seller)
const getMyTransactions = async (req, res, next) => {
    try {
        // Get pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Query transactions where user is either buyer or seller
        const query = {
            $or: [
                { buyerId: req.user.id },
                { sellerId: req.user.id }
            ]
        };

        // Find transactions with populated fields
        const transactions = await Transaction.find(query)
            .populate('couponId')
            .populate('buyerId', 'name email')
            .populate('sellerId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalCount = await Transaction.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            success: true,
            transactions,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit
            }
        });
    } catch (error) {
        console.error('Get my transactions error:', error);
        next(error);
    }
};

// Get single transaction details
const getTransactionById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid transaction ID format'
                }
            });
        }

        // Find the transaction
        const transaction = await Transaction.findById(id)
            .populate('couponId')
            .populate('buyerId', 'name email')
            .populate('sellerId', 'name email trustScore');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Transaction not found'
                }
            });
        }

        // Verify user is either buyer or seller
        if (
            transaction.buyerId._id.toString() !== req.user.id &&
            transaction.sellerId._id.toString() !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to view this transaction'
                }
            });
        }

        res.status(200).json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error('Get transaction by ID error:', error);
        next(error);
    }
};

// Get transactions for a specific user (admin only)
const getUserTransactions = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid user ID format'
                }
            });
        }

        // Query transactions where user is either buyer or seller
        const query = {
            $or: [
                { buyerId: userId },
                { sellerId: userId }
            ]
        };

        // Find transactions with populated fields
        const transactions = await Transaction.find(query)
            .populate('couponId', 'storeName code')
            .populate('buyerId', 'name email')
            .populate('sellerId', 'name email')
            .sort({ createdAt: -1 })
            .limit(50); // Limit to 50 most recent transactions

        res.status(200).json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Get user transactions error:', error);
        next(error);
    }
};

module.exports = {
    createTransaction,
    confirmTransaction,
    disputeTransaction,
    getMyTransactions,
    getTransactionById,
    getUserTransactions
};
