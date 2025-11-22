const Notification = require('../models/Notification');

/**
 * Notification templates for different event types
 */
const notificationTemplates = {
    purchase: {
        buyer: (couponCode, brand, price) => ({
            title: 'Purchase Successful',
            message: `You have successfully purchased a ${brand} coupon for $${price}. Your coupon code is: ${couponCode}. You have 15 minutes to verify it works.`
        }),
        seller: (brand, price, buyerName) => ({
            title: 'Coupon Sold',
            message: `Your ${brand} coupon has been purchased by ${buyerName} for $${price}. Payment is being held in escrow pending buyer confirmation.`
        })
    },
    sale: {
        completed: (brand, price) => ({
            title: 'Payment Released',
            message: `Payment of $${price} for your ${brand} coupon has been released. The buyer confirmed the coupon works!`
        })
    },
    warning: {
        rejection: (brand, reason) => ({
            title: 'Coupon Rejected',
            message: `Your ${brand} coupon has been rejected by an admin. Reason: ${reason}. You have received a warning.`
        }),
        dispute: (brand) => ({
            title: 'Dispute Filed',
            message: `A buyer has reported that your ${brand} coupon does not work. This has been recorded as a warning.`
        }),
        timerWarning: (minutesRemaining) => ({
            title: 'Verification Time Running Out',
            message: `You have ${minutesRemaining} minutes remaining to verify your purchased coupon. Please confirm if it works or report an issue.`
        })
    },
    ban: {
        automatic: (reason) => ({
            title: 'Account Suspended',
            message: `Your account has been suspended due to ${reason}. You can no longer list or purchase coupons. Please contact support for more information.`
        }),
        manual: (reason) => ({
            title: 'Account Banned',
            message: `Your account has been banned by an administrator. Reason: ${reason}. Please contact support if you believe this is an error.`
        })
    },
    approval: {
        coupon: (brand) => ({
            title: 'Coupon Approved',
            message: `Great news! Your ${brand} coupon has been approved and is now visible in the marketplace.`
        })
    },
    rejection: {
        coupon: (brand, reason) => ({
            title: 'Coupon Rejected',
            message: `Your ${brand} coupon has been rejected. Reason: ${reason}. Please review and resubmit with corrections.`
        })
    }
};

/**
 * Create a notification in the database
 * @param {String} userId - The user ID to send notification to
 * @param {String} type - Notification type (purchase, sale, warning, ban, approval, rejection)
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {String} relatedId - Optional related document ID (coupon or transaction)
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (userId, type, title, message, relatedId = null) => {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            relatedId
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Create notification for coupon purchase event
 * @param {Object} buyer - Buyer user object
 * @param {Object} seller - Seller user object
 * @param {Object} coupon - Coupon object
 * @param {String} transactionId - Transaction ID
 */
const notifyPurchase = async (buyer, seller, coupon, transactionId) => {
    try {
        // Notify buyer
        const buyerTemplate = notificationTemplates.purchase.buyer(
            coupon.code,
            coupon.storeName,
            coupon.price
        );
        await createNotification(
            buyer._id,
            'purchase',
            buyerTemplate.title,
            buyerTemplate.message,
            transactionId
        );

        // Notify seller
        const sellerTemplate = notificationTemplates.purchase.seller(
            coupon.storeName,
            coupon.price,
            buyer.name
        );
        await createNotification(
            seller._id,
            'sale',
            sellerTemplate.title,
            sellerTemplate.message,
            transactionId
        );
    } catch (error) {
        console.error('Error creating purchase notifications:', error);
    }
};

/**
 * Create notification for successful sale completion
 * @param {String} sellerId - Seller user ID
 * @param {Object} coupon - Coupon object
 * @param {String} transactionId - Transaction ID
 */
const notifySaleCompleted = async (sellerId, coupon, transactionId) => {
    try {
        const template = notificationTemplates.sale.completed(
            coupon.storeName,
            coupon.price
        );
        await createNotification(
            sellerId,
            'sale',
            template.title,
            template.message,
            transactionId
        );
    } catch (error) {
        console.error('Error creating sale completion notification:', error);
    }
};

/**
 * Create notification for coupon approval
 * @param {String} sellerId - Seller user ID
 * @param {Object} coupon - Coupon object
 */
const notifyCouponApproval = async (sellerId, coupon) => {
    try {
        const template = notificationTemplates.approval.coupon(coupon.storeName);
        await createNotification(
            sellerId,
            'approval',
            template.title,
            template.message,
            coupon._id
        );
    } catch (error) {
        console.error('Error creating approval notification:', error);
    }
};

/**
 * Create notification for coupon rejection
 * @param {String} sellerId - Seller user ID
 * @param {Object} coupon - Coupon object
 * @param {String} reason - Rejection reason
 */
const notifyCouponRejection = async (sellerId, coupon, reason) => {
    try {
        const template = notificationTemplates.rejection.coupon(
            coupon.storeName,
            reason
        );
        await createNotification(
            sellerId,
            'rejection',
            template.title,
            template.message,
            coupon._id
        );
    } catch (error) {
        console.error('Error creating rejection notification:', error);
    }
};

/**
 * Create notification for dispute/warning
 * @param {String} sellerId - Seller user ID
 * @param {Object} coupon - Coupon object
 * @param {String} transactionId - Transaction ID
 */
const notifyDispute = async (sellerId, coupon, transactionId) => {
    try {
        const template = notificationTemplates.warning.dispute(coupon.storeName);
        await createNotification(
            sellerId,
            'warning',
            template.title,
            template.message,
            transactionId
        );
    } catch (error) {
        console.error('Error creating dispute notification:', error);
    }
};

/**
 * Create notification for user ban
 * @param {String} userId - User ID
 * @param {String} reason - Ban reason
 * @param {Boolean} isAutomatic - Whether ban was automatic or manual
 */
const notifyBan = async (userId, reason, isAutomatic = true) => {
    try {
        const template = isAutomatic
            ? notificationTemplates.ban.automatic(reason)
            : notificationTemplates.ban.manual(reason);
        await createNotification(
            userId,
            'ban',
            template.title,
            template.message
        );
    } catch (error) {
        console.error('Error creating ban notification:', error);
    }
};

/**
 * Create notification for timer warning (5 minutes remaining)
 * @param {String} buyerId - Buyer user ID
 * @param {String} transactionId - Transaction ID
 * @param {Number} minutesRemaining - Minutes remaining
 */
const notifyTimerWarning = async (buyerId, transactionId, minutesRemaining = 5) => {
    try {
        const template = notificationTemplates.warning.timerWarning(minutesRemaining);
        await createNotification(
            buyerId,
            'warning',
            template.title,
            template.message,
            transactionId
        );
    } catch (error) {
        console.error('Error creating timer warning notification:', error);
    }
};

/**
 * Create notification for refund
 * @param {String} buyerId - Buyer user ID
 * @param {Object} coupon - Coupon object
 * @param {String} transactionId - Transaction ID
 */
const notifyRefund = async (buyerId, coupon, transactionId) => {
    try {
        await createNotification(
            buyerId,
            'purchase',
            'Refund Processed',
            `Your dispute has been processed and you have been refunded $${coupon.price} for the ${coupon.storeName} coupon.`,
            transactionId
        );
    } catch (error) {
        console.error('Error creating refund notification:', error);
    }
};

module.exports = {
    createNotification,
    notificationTemplates,
    notifyPurchase,
    notifySaleCompleted,
    notifyCouponApproval,
    notifyCouponRejection,
    notifyDispute,
    notifyBan,
    notifyTimerWarning,
    notifyRefund
};
