const express = require('express');
const router = express.Router();
const { verifyToken, isNotBanned } = require('../middleware/authMiddleware');
const { webhookRateLimiter } = require('../middleware/rateLimitMiddleware');
const { createOrder, verifyPayment, handleWebhook, initiateRefund } = require('../controllers/paymentController');

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

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public (webhooks come from Stripe, no authentication)
 * @note    Rate limited to prevent abuse
 */
router.post('/webhook', webhookRateLimiter, handleWebhook);

/**
 * @route   POST /api/payments/refund/:id
 * @desc    Initiate refund for a transaction
 * @access  Private (authenticated users only)
 */
router.post('/refund/:id', verifyToken, isNotBanned, initiateRefund);

module.exports = router;
