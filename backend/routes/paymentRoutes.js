const express = require('express');
const router = express.Router();
const { verifyToken, isNotBanned } = require('../middleware/authMiddleware');
const { webhookRateLimiter } = require('../middleware/rateLimitMiddleware');
const { createOrder, verifyPayment, handleWebhook, initiateRefund, retryPayment } = require('../controllers/paymentController');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Stripe Payment Intent for coupon purchase
 * @access  Private (authenticated users only)
 */
router.post('/create-order', verifyToken, isNotBanned, createOrder);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Stripe payment and complete transaction
 * @access  Private (authenticated users only)
 */
router.post('/verify', verifyToken, isNotBanned, verifyPayment);

// Webhook is handled directly in server.js with raw body parsing
// This is necessary for Stripe signature verification

/**
 * @route   POST /api/payments/refund/:id
 * @desc    Initiate refund for a transaction
 * @access  Private (authenticated users only)
 */
router.post('/refund/:id', verifyToken, isNotBanned, initiateRefund);

/**
 * @route   POST /api/payments/retry/:couponId
 * @desc    Retry payment by clearing pending transaction
 * @access  Private (authenticated users only)
 */
router.post('/retry/:couponId', verifyToken, isNotBanned, retryPayment);

module.exports = router;
