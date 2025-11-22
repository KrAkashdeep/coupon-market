const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');

// Track which transactions have already received timer warnings
const warnedTransactions = new Set();

/**
 * Send timer warning notifications
 * Runs every minute to check for transactions that have 5 minutes or less remaining
 * and sends a warning notification to the buyer
 */
const sendTimerWarnings = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

            // Find all transactions with paymentStatus 'holding' and expiresAt within 5 minutes
            const expiringTransactions = await Transaction.find({
                paymentStatus: 'holding',
                expiresAt: { $lte: fiveMinutesFromNow, $gt: now }
            }).populate('buyerId couponId');

            if (expiringTransactions.length === 0) {
                return; // No expiring transactions to warn about
            }

            // Process each expiring transaction
            for (const transaction of expiringTransactions) {
                try {
                    // Skip if we've already warned about this transaction
                    const transactionId = transaction._id.toString();
                    if (warnedTransactions.has(transactionId)) {
                        continue;
                    }

                    // Calculate minutes remaining
                    const timeRemaining = transaction.expiresAt - now;
                    const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));

                    // Only send warning if 5 minutes or less remaining
                    if (minutesRemaining <= 5 && minutesRemaining > 0) {
                        // Create timer warning notification for buyer
                        if (transaction.buyerId) {
                            const { notifyTimerWarning } = require('./notificationHelper');
                            await notifyTimerWarning(
                                transaction.buyerId._id,
                                transaction._id,
                                minutesRemaining
                            );

                            // Mark this transaction as warned
                            warnedTransactions.add(transactionId);

                            console.log(`[CRON] Sent timer warning for transaction ${transaction._id} (${minutesRemaining} minutes remaining)`);
                        }
                    }
                } catch (error) {
                    console.error(`[CRON] Error sending timer warning for transaction ${transaction._id}:`, error.message);
                }
            }

            // Clean up warned transactions that have expired or completed
            // This prevents the Set from growing indefinitely
            const activeTransactionIds = expiringTransactions.map(t => t._id.toString());
            for (const warnedId of warnedTransactions) {
                if (!activeTransactionIds.includes(warnedId)) {
                    warnedTransactions.delete(warnedId);
                }
            }
        } catch (error) {
            console.error('[CRON] Error in timer warning job:', error.message);
        }
    });

    console.log('[CRON] Timer warning job scheduled to run every minute');
};

/**
 * Auto-confirm expired transactions
 * Runs every minute to check for transactions that have expired
 * and automatically confirms them, releasing payment to seller
 */
const autoConfirmExpiredTransactions = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Find all transactions with paymentStatus 'holding' and expiresAt < now
            const expiredTransactions = await Transaction.find({
                paymentStatus: 'holding',
                expiresAt: { $lt: now }
            }).populate('buyerId sellerId couponId');

            if (expiredTransactions.length === 0) {
                return; // No expired transactions to process
            }

            console.log(`[CRON] Found ${expiredTransactions.length} expired transaction(s) to auto-confirm`);

            // Process each expired transaction
            for (const transaction of expiredTransactions) {
                try {
                    // Call release() method to auto-confirm
                    await transaction.release();

                    // Update coupon status to 'sold'
                    if (transaction.couponId) {
                        await Coupon.findByIdAndUpdate(transaction.couponId._id, {
                            status: 'sold'
                        });
                    }

                    // Update seller trust score (+5 points for successful sale)
                    if (transaction.sellerId) {
                        const seller = await User.findById(transaction.sellerId._id);
                        if (seller) {
                            seller.trustScore = Math.min(100, seller.trustScore + 5);
                            await seller.save();
                        }
                    }

                    // Create notification for buyer (auto-confirmed)
                    if (transaction.buyerId) {
                        await Notification.create({
                            userId: transaction.buyerId._id,
                            type: 'purchase',
                            title: 'Transaction Auto-Confirmed',
                            message: 'Your transaction was automatically confirmed as the verification period expired. Payment has been released to the seller.',
                            relatedId: transaction._id
                        });
                    }

                    // Create notification for seller (payment released)
                    if (transaction.sellerId) {
                        await Notification.create({
                            userId: transaction.sellerId._id,
                            type: 'sale',
                            title: 'Payment Released',
                            message: 'Payment for your coupon has been automatically released as the buyer verification period expired.',
                            relatedId: transaction._id
                        });
                    }

                    console.log(`[CRON] Auto-confirmed transaction ${transaction._id}`);
                } catch (error) {
                    console.error(`[CRON] Error processing transaction ${transaction._id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[CRON] Error in auto-confirm job:', error.message);
        }
    });

    console.log('[CRON] Auto-confirm job scheduled to run every minute');
};

module.exports = {
    autoConfirmExpiredTransactions,
    sendTimerWarnings
};
