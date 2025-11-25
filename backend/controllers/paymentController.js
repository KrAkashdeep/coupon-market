const stripeInstance = require('../config/stripe');
const Coupon = require('../models/Coupon');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');

/**
 * Create Stripe Payment Intent for coupon purchase
 * @route POST /api/payments/create-order
 * @access Private
 */
const createOrder = async (req, res, next) => {
    try {
        const { couponId } = req.body;
        const buyerId = req.user.id;

        console.log('🔵 createOrder called with couponId:', couponId, 'buyerId:', buyerId);

        // Validate couponId is provided
        if (!couponId) {
            console.error('❌ Missing couponId in request body');
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_COUPON_ID',
                    message: 'Coupon ID is required'
                }
            });
        }

        // Find coupon and populate seller details
        const coupon = await Coupon.findById(couponId).populate('sellerId', 'name email');
        console.log('📦 Coupon found:', coupon ? 'Yes' : 'No', coupon ? `Status: ${coupon.status}` : '');

        // Check if coupon exists
        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COUPON_NOT_FOUND',
                    message: 'Coupon not found'
                }
            });
        }

        // Check if coupon is approved
        if (coupon.status !== 'approved') {
            console.error('Coupon not approved. Status:', coupon.status);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'COUPON_NOT_APPROVED',
                    message: `Coupon is not approved for purchase. Current status: ${coupon.status}`
                }
            });
        }

        // Check if coupon is already sold
        if (coupon.isSold) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'COUPON_ALREADY_SOLD',
                    message: 'Coupon is no longer available'
                }
            });
        }

        // Check if coupon is expired
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
        if (coupon.sellerId._id.toString() === buyerId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CANNOT_BUY_OWN_COUPON',
                    message: 'You cannot purchase your own coupon'
                }
            });
        }

        // Check if a pending transaction already exists for this coupon
        let existingTransaction = await Transaction.findOne({
            couponId: couponId,
            paymentStatus: { $in: ['pending', 'processing'] }
        });

        // If pending transaction exists
        if (existingTransaction) {
            const now = new Date();
            const timeLeft = Math.floor((existingTransaction.expiresAt - now) / 1000 / 60); // minutes

            // If not expired and belongs to same buyer, return error with time left
            if (existingTransaction.expiresAt > now) {
                if (existingTransaction.buyerId.toString() === buyerId) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'PAYMENT_IN_PROGRESS',
                            message: `You already have a pending payment for this coupon. Please complete it or wait ${timeLeft} minutes for it to expire.`
                        }
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'PAYMENT_IN_PROGRESS',
                            message: 'Another buyer is currently purchasing this coupon. Please try again later.'
                        }
                    });
                }
            }

            // If expired, delete it
            await Transaction.deleteOne({ _id: existingTransaction._id });
            console.log('Deleted expired transaction:', existingTransaction._id);
        }

        // Validate minimum amount for Stripe (₹1 minimum)
        if (coupon.price < 1) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'AMOUNT_TOO_SMALL',
                    message: 'Coupon price must be at least ₹1'
                }
            });
        }

        // Create Stripe Checkout Session with amount in paise (amount * 100)
        const amountInPaise = Math.round(coupon.price * 100);

        console.log('💳 Creating Stripe Checkout Session...');
        console.log('  Amount:', amountInPaise, 'paise (₹' + coupon.price + ')');
        console.log('  Currency: INR');
        console.log('  Coupon:', coupon.storeName, '-', coupon.code);

        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `${coupon.storeName} Coupon`,
                            description: coupon.title,
                        },
                        unit_amount: amountInPaise,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/coupons/${couponId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/coupons/${couponId}?payment=cancelled`,
            metadata: {
                couponId: couponId,
                buyerId: buyerId,
                sellerId: coupon.sellerId._id.toString()
            },
        });

        console.log('✅ Stripe session created successfully');
        console.log('  Session ID:', session.id);
        console.log('  Session URL:', session.url);
        console.log('  Payment Intent:', session.payment_intent);

        // Create transaction record with stripePaymentIntentId and status 'pending'
        const transaction = await Transaction.create({
            buyerId: buyerId,
            sellerId: coupon.sellerId._id,
            couponId: couponId,
            amount: coupon.price,
            stripePaymentIntentId: session.payment_intent || session.id,
            paymentStatus: 'pending',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        });

        // Return checkout session details
        console.log('📤 Sending response with session URL');
        return res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                sessionUrl: session.url,
                amount: amountInPaise,
                currency: 'INR',
                couponDetails: {
                    id: coupon._id,
                    title: coupon.title,
                    storeName: coupon.storeName,
                    price: coupon.price,
                    discountPercent: coupon.discountPercent,
                    discountAmount: coupon.discountAmount
                }
            }
        });
        console.log('✅ Response sent successfully');

    } catch (error) {
        // Log the actual error for debugging
        console.error('❌ Stripe Checkout Session Error:', error);
        console.error('Error type:', error.type);
        console.error('Error message:', error.message);

        // Handle Stripe API errors
        if (error.type) {
            let errorMessage = 'Payment service error. Please try again.';

            // Provide specific error messages for common Stripe errors
            if (error.code === 'amount_too_small') {
                errorMessage = 'Coupon price is too low. Minimum amount is ₹1.';
            } else if (error.code === 'invalid_request_error') {
                errorMessage = 'Invalid payment request. Please contact support.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'STRIPE_API_ERROR',
                    message: errorMessage
                }
            });
        }

        // Handle database errors
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Database error occurred, please try again'
                }
            });
        }

        // Pass to error handler middleware
        next(error);
    }
};

/**
 * Verify Stripe payment and complete transaction
 * @route POST /api/payments/verify
 * @access Private
 */
const verifyPayment = async (req, res, next) => {
    try {
        const { sessionId } = req.body;
        const buyerId = req.user.id;

        // Validate required fields
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_PAYMENT_DETAILS',
                    message: 'Session ID is required'
                }
            });
        }

        // Retrieve checkout session from Stripe to verify status
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);

        // Check if payment was successful
        if (session.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'PAYMENT_NOT_SUCCESSFUL',
                    message: 'Payment was not successful'
                }
            });
        }

        console.log('Verifying payment for session:', sessionId);
        console.log('Session payment_intent:', session.payment_intent);
        console.log('Session id:', session.id);

        // Find transaction by stripePaymentIntentId
        // Try both payment_intent and session.id
        let transaction = await Transaction.findOne({
            stripePaymentIntentId: session.payment_intent
        });

        // If not found by payment_intent, try by session.id
        if (!transaction) {
            transaction = await Transaction.findOne({
                stripePaymentIntentId: session.id
            });
        }

        // If still not found, try by couponId and buyerId (fallback)
        if (!transaction) {
            const couponId = session.metadata?.couponId;
            if (couponId) {
                transaction = await Transaction.findOne({
                    couponId: couponId,
                    buyerId: buyerId,
                    paymentStatus: 'pending'
                });

                // Update the transaction with correct payment intent ID
                if (transaction) {
                    transaction.stripePaymentIntentId = session.payment_intent || session.id;
                    console.log('Found transaction by couponId, updating payment intent ID');
                }
            }
        }

        if (!transaction) {
            console.error('Transaction not found for session:', sessionId);
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Order not found'
                }
            });
        }

        // Check if transaction already processed
        if (transaction.paymentStatus === 'completed') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_PROCESSED',
                    message: 'Payment already processed'
                }
            });
        }

        // Verify the buyer matches
        if (transaction.buyerId.toString() !== buyerId) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Unauthorized to verify this payment'
                }
            });
        }

        // Update transaction status to 'completed'
        transaction.paymentStatus = 'completed';
        transaction.completedAt = new Date();
        await transaction.save();

        // Sub-task 4.2: Update coupon after successful payment
        const coupon = await Coupon.findById(transaction.couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COUPON_NOT_FOUND',
                    message: 'Coupon not found'
                }
            });
        }

        // Mark coupon as sold (isSold = true)
        coupon.isSold = true;
        // Set buyerId to purchasing user
        coupon.buyerId = buyerId;
        // Update coupon status to 'sold'
        coupon.status = 'sold';
        await coupon.save();

        // Sub-task 4.3: Update user statistics
        // Increment seller's totalCouponsSold
        await User.findByIdAndUpdate(
            transaction.sellerId,
            { $inc: { totalCouponsSold: 1 } }
        );

        // Increment buyer's totalCouponsBought
        await User.findByIdAndUpdate(
            buyerId,
            { $inc: { totalCouponsBought: 1 } }
        );

        // Sub-task 4.4: Create notifications for payment success
        // Create notification for buyer with coupon code
        await Notification.create({
            userId: buyerId,
            type: 'purchase',
            title: 'Purchase Successful',
            message: `You have successfully purchased ${coupon.storeName} coupon. Your coupon code is: ${coupon.code}`,
            relatedId: coupon._id
        });

        // Create notification for seller about sale
        await Notification.create({
            userId: transaction.sellerId,
            type: 'sale',
            title: 'Coupon Sold',
            message: `Your ${coupon.storeName} coupon has been sold for ₹${transaction.amount}`,
            relatedId: coupon._id
        });

        // Return success response with transaction details
        return res.status(200).json({
            success: true,
            data: {
                transaction: {
                    id: transaction._id,
                    amount: transaction.amount,
                    status: transaction.paymentStatus,
                    completedAt: transaction.completedAt
                },
                coupon: {
                    id: coupon._id,
                    code: coupon.code,
                    storeName: coupon.storeName,
                    title: coupon.title,
                    discountPercent: coupon.discountPercent,
                    discountAmount: coupon.discountAmount,
                    expiryDate: coupon.expiryDate
                }
            }
        });

    } catch (error) {
        // Handle database errors
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Database error occurred, please try again'
                }
            });
        }

        // Pass to error handler middleware
        next(error);
    }
};

/**
 * Handle Stripe webhook events
 * @route POST /api/payments/webhook
 * @access Public (no auth - webhooks come from Stripe)
 */
const handleWebhook = async (req, res, next) => {
    try {
        // Extract webhook signature from headers
        const webhookSignature = req.headers['stripe-signature'];

        if (!webhookSignature) {
            console.warn('⚠️ SECURITY WARNING: Webhook received without signature');
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_SIGNATURE',
                    message: 'Webhook signature missing'
                }
            });
        }

        let event;

        try {
            // Verify webhook signature using Stripe SDK
            event = stripeInstance.webhooks.constructEvent(
                req.body,
                webhookSignature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.warn('⚠️ SECURITY WARNING: Invalid webhook signature received');
            console.warn(`Error: ${err.message}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_WEBHOOK_SIGNATURE',
                    message: 'Webhook signature verification failed'
                }
            });
        }

        console.log(`✅ Webhook received: ${event.type}`);

        // Process different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await processPaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await processPaymentFailed(event.data.object);
                break;
            case 'charge.refunded':
                await processRefundProcessed(event.data.object);
                break;
            default:
                console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
        }

        // Return success response
        return res.status(200).json({
            success: true,
            received: true
        });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);

        // Still return 200 to prevent Stripe from retrying
        // Log the error for investigation
        return res.status(200).json({
            success: false,
            received: true,
            error: 'Internal processing error'
        });
    }
};

/**
 * Process payment_intent.succeeded event
 * Sub-task 5.2
 */
const processPaymentSucceeded = async (paymentIntent) => {
    try {
        const stripePaymentIntentId = paymentIntent.id;

        console.log(`Processing payment_intent.succeeded for: ${stripePaymentIntentId}`);

        // Find transaction by stripePaymentIntentId
        const transaction = await Transaction.findOne({ stripePaymentIntentId });

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${stripePaymentIntentId}`);
            return;
        }

        // Check if already processed
        if (transaction.paymentStatus === 'completed') {
            console.log(`Transaction already completed: ${transaction._id}`);
            return;
        }

        // Update transaction status to 'completed'
        transaction.paymentStatus = 'completed';
        transaction.completedAt = new Date();
        await transaction.save();

        // Mark coupon as sold
        const coupon = await Coupon.findById(transaction.couponId);
        if (coupon) {
            coupon.isSold = true;
            coupon.buyerId = transaction.buyerId;
            coupon.status = 'sold';
            await coupon.save();
        }

        // Update user statistics
        // Increment seller's totalCouponsSold
        await User.findByIdAndUpdate(
            transaction.sellerId,
            { $inc: { totalCouponsSold: 1 } }
        );

        // Increment buyer's totalCouponsBought
        await User.findByIdAndUpdate(
            transaction.buyerId,
            { $inc: { totalCouponsBought: 1 } }
        );

        // Create success notifications
        if (coupon) {
            // Notification for buyer with coupon code
            await Notification.create({
                userId: transaction.buyerId,
                type: 'purchase',
                title: 'Payment Successful',
                message: `Your payment has been confirmed! Coupon code: ${coupon.code}`,
                relatedId: coupon._id
            });

            // Notification for seller about sale
            await Notification.create({
                userId: transaction.sellerId,
                type: 'sale',
                title: 'Coupon Sold',
                message: `Your ${coupon.storeName} coupon has been sold for ₹${transaction.amount}`,
                relatedId: coupon._id
            });
        }

        console.log(`✅ Payment succeeded successfully for transaction: ${transaction._id}`);

    } catch (error) {
        console.error('Error processing payment_intent.succeeded:', error);
        throw error;
    }
};

/**
 * Process payment_intent.payment_failed event
 * Sub-task 5.3
 */
const processPaymentFailed = async (paymentIntent) => {
    try {
        const stripePaymentIntentId = paymentIntent.id;

        console.log(`Processing payment_intent.payment_failed for: ${stripePaymentIntentId}`);

        // Find transaction by stripePaymentIntentId
        const transaction = await Transaction.findOne({ stripePaymentIntentId });

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${stripePaymentIntentId}`);
            return;
        }

        // Update transaction status to 'failed'
        transaction.paymentStatus = 'failed';
        transaction.completedAt = new Date();
        await transaction.save();

        // Create failure notification for buyer
        const coupon = await Coupon.findById(transaction.couponId);
        if (coupon) {
            await Notification.create({
                userId: transaction.buyerId,
                type: 'warning',
                title: 'Payment Failed',
                message: `Your payment for ${coupon.storeName} coupon failed. Please try again.`,
                relatedId: coupon._id
            });
        }

        console.log(`✅ Payment failure processed for transaction: ${transaction._id}`);

    } catch (error) {
        console.error('Error processing payment_intent.payment_failed:', error);
        throw error;
    }
};

/**
 * Process charge.refunded event
 * Sub-task 5.4
 */
const processRefundProcessed = async (charge) => {
    try {
        const stripeChargeId = charge.id;
        const stripeRefundId = charge.refunds.data[0]?.id;

        console.log(`Processing charge.refunded for charge: ${stripeChargeId}`);

        // Find transaction by stripePaymentIntentId (charge has payment_intent)
        const transaction = await Transaction.findOne({ stripePaymentIntentId: charge.payment_intent });

        if (!transaction) {
            console.error(`Transaction not found for payment intent: ${charge.payment_intent}`);
            return;
        }

        // Update transaction status to 'refunded'
        transaction.paymentStatus = 'refunded';
        transaction.stripeRefundId = stripeRefundId;
        transaction.completedAt = new Date();
        await transaction.save();

        // Mark coupon as available again
        const coupon = await Coupon.findById(transaction.couponId);
        if (coupon) {
            coupon.isSold = false;
            coupon.buyerId = null;
            coupon.status = 'approved'; // Back to approved status
            await coupon.save();

            // Create refund notifications
            // Notification for buyer
            await Notification.create({
                userId: transaction.buyerId,
                type: 'warning',
                title: 'Refund Processed',
                message: `Your refund of ₹${transaction.amount} for ${coupon.storeName} coupon has been processed.`,
                relatedId: coupon._id
            });

            // Notification for seller
            await Notification.create({
                userId: transaction.sellerId,
                type: 'warning',
                title: 'Refund Issued',
                message: `A refund of ₹${transaction.amount} has been issued for your ${coupon.storeName} coupon.`,
                relatedId: coupon._id
            });
        }

        console.log(`✅ Refund processed successfully for transaction: ${transaction._id}`);

    } catch (error) {
        console.error('Error processing refund.processed:', error);
        throw error;
    }
};

/**
 * Initiate refund for a transaction
 * @route POST /api/payments/refund/:id
 * @access Private
 */
const initiateRefund = async (req, res, next) => {
    try {
        const transactionId = req.params.id;
        const { reason } = req.body;
        const userId = req.user.id;

        // Validate transactionId
        if (!transactionId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_TRANSACTION_ID',
                    message: 'Transaction ID is required'
                }
            });
        }

        // Find transaction and validate status is 'completed'
        const transaction = await Transaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Transaction not found'
                }
            });
        }

        // Validate transaction status is 'completed'
        if (transaction.paymentStatus !== 'completed') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TRANSACTION_STATUS',
                    message: 'Only completed transactions can be refunded'
                }
            });
        }

        // Verify user is the buyer
        if (transaction.buyerId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Only the buyer can request a refund'
                }
            });
        }

        // Check if already refunded
        if (transaction.stripeRefundId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_REFUNDED',
                    message: 'Refund already processed'
                }
            });
        }

        // Create refund via Stripe API using stripePaymentIntentId
        const refund = await stripeInstance.refunds.create({
            payment_intent: transaction.stripePaymentIntentId,
            amount: Math.round(transaction.amount * 100), // Amount in paise
            metadata: {
                reason: reason || 'Buyer requested refund',
                transactionId: transactionId
            }
        });

        // Update transaction with stripeRefundId and status 'refunded'
        transaction.stripeRefundId = refund.id;
        transaction.paymentStatus = 'refunded';
        transaction.disputeReason = reason || 'Buyer requested refund';
        transaction.completedAt = new Date();
        await transaction.save();

        // Sub-task 6.2: Update coupon after refund
        const coupon = await Coupon.findById(transaction.couponId);
        if (coupon) {
            // Mark coupon as available (isSold = false)
            coupon.isSold = false;
            // Clear buyerId
            coupon.buyerId = null;
            // Set status back to approved
            coupon.status = 'approved';
            await coupon.save();
        }

        // Sub-task 6.3: Update seller trust score
        const seller = await User.findById(transaction.sellerId);
        if (seller) {
            // Decrease seller trustScore by 50 points
            seller.trustScore = Math.max(0, seller.trustScore - 50);
            // Increment seller warningsCount
            seller.warningsCount += 1;

            // Check if seller should be banned (warnings >= 3 or trustScore < 20)
            if (seller.warningsCount >= 3 || seller.trustScore < 20) {
                seller.isBanned = true;
            }

            await seller.save();

            // Sub-task 6.4: Create refund notifications
            // Create notification for buyer about refund
            await Notification.create({
                userId: transaction.buyerId,
                type: 'warning',
                title: 'Refund Initiated',
                message: `Your refund of ₹${transaction.amount} has been initiated. It will be processed within 5-7 business days.`,
                relatedId: coupon ? coupon._id : null
            });

            // Create notification for seller about dispute
            await Notification.create({
                userId: transaction.sellerId,
                type: 'warning',
                title: 'Refund Issued',
                message: `A refund of ₹${transaction.amount} has been issued for your coupon. Your trust score has been decreased.`,
                relatedId: coupon ? coupon._id : null
            });

            // If seller banned, create ban notification
            if (seller.isBanned) {
                await Notification.create({
                    userId: transaction.sellerId,
                    type: 'ban',
                    title: 'Account Banned',
                    message: 'Your account has been banned due to multiple refunds and low trust score. Please contact support.',
                    relatedId: null
                });
            }
        }

        // Return success response
        return res.status(200).json({
            success: true,
            data: {
                refundId: refund.id,
                amount: transaction.amount,
                status: 'refunded',
                message: 'Refund initiated successfully'
            }
        });

    } catch (error) {
        // Handle Stripe API errors
        if (error.type) {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'STRIPE_REFUND_ERROR',
                    message: 'Refund failed, please contact support'
                }
            });
        }

        // Handle database errors
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Database error occurred, please try again'
                }
            });
        }

        // Pass to error handler middleware
        next(error);
    }
};

/**
 * Retry payment by clearing pending transaction
 * @route POST /api/payments/retry/:couponId
 * @access Private
 */
const retryPayment = async (req, res, next) => {
    try {
        const { couponId } = req.params;
        const buyerId = req.user.id;

        console.log('🔄 Retry payment called for couponId:', couponId, 'buyerId:', buyerId);

        // Validate couponId
        if (!couponId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_COUPON_ID',
                    message: 'Coupon ID is required'
                }
            });
        }

        // Find pending transaction for this coupon and buyer
        const pendingTransaction = await Transaction.findOne({
            couponId: couponId,
            buyerId: buyerId,
            paymentStatus: { $in: ['pending', 'processing'] }
        });

        if (!pendingTransaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NO_PENDING_PAYMENT',
                    message: 'No pending payment found for this coupon'
                }
            });
        }

        console.log('✅ Found pending transaction:', pendingTransaction._id);
        console.log('🗑️ Deleting pending transaction...');

        // Delete the pending transaction
        await Transaction.deleteOne({ _id: pendingTransaction._id });

        console.log('✅ Pending transaction deleted successfully');

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Pending payment cleared. You can now try purchasing again.',
            data: {
                couponId: couponId,
                cleared: true
            }
        });

    } catch (error) {
        console.error('❌ Error in retryPayment:', error);
        next(error);
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    handleWebhook,
    initiateRefund,
    retryPayment
};
