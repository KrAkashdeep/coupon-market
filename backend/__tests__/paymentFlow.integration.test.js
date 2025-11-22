const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const paymentController = require('../controllers/paymentController');
const Coupon = require('../models/Coupon');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Mock Razorpay
jest.mock('../config/razorpay', () => ({
    orders: {
        create: jest.fn()
    },
    payments: {
        refund: jest.fn()
    }
}));

const razorpayInstance = require('../config/razorpay');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
    req.user = { id: req.headers['x-user-id'] || 'buyer123' };
    next();
};

// Setup routes
app.post('/api/payments/create-order', mockAuth, paymentController.createOrder);
app.post('/api/payments/verify', mockAuth, paymentController.verifyPayment);
app.post('/api/payments/webhook', paymentController.handleWebhook);
app.post('/api/payments/refund/:id', mockAuth, paymentController.initiateRefund);

describe('Payment Flow Integration Tests', () => {
    let seller, buyer, coupon;

    beforeEach(async () => {
        // Set environment variables
        process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
        process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret';

        // Create test users
        seller = await User.create({
            name: 'Seller User',
            email: 'seller@test.com',
            password: 'hashedpassword',
            role: 'user',
            totalCouponsSold: 0,
            trustScore: 100,
            warningsCount: 0
        });

        buyer = await User.create({
            name: 'Buyer User',
            email: 'buyer@test.com',
            password: 'hashedpassword',
            role: 'user',
            totalCouponsBought: 0
        });

        // Create test coupon
        coupon = await Coupon.create({
            title: 'Test Coupon',
            storeName: 'Test Store',
            description: 'Test Description',
            discountPercent: 50,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            price: 100,
            code: 'TEST123',
            sellerId: seller._id,
            status: 'approved',
            isSold: false
        });

        // Mock Razorpay order creation
        razorpayInstance.orders.create.mockResolvedValue({
            id: 'order_integration_test',
            amount: 10000,
            currency: 'INR'
        });

        // Mock Razorpay refund
        razorpayInstance.payments.refund.mockResolvedValue({
            id: 'rfnd_integration_test',
            amount: 10000,
            status: 'processed'
        });
    });

    describe('End-to-End Order Creation to Verification', () => {
        test('should complete full payment flow from order creation to verification', async () => {
            // Step 1: Create order
            const createOrderResponse = await request(app)
                .post('/api/payments/create-order')
                .set('x-user-id', buyer._id.toString())
                .send({ couponId: coupon._id.toString() });

            expect(createOrderResponse.status).toBe(201);
            expect(createOrderResponse.body.success).toBe(true);
            const orderId = createOrderResponse.body.data.orderId;

            // Verify transaction was created
            let transaction = await Transaction.findOne({ razorpayOrderId: orderId });
            expect(transaction).toBeTruthy();
            expect(transaction.paymentStatus).toBe('pending');

            // Step 2: Simulate payment and verify
            const paymentId = 'pay_integration_test';
            const signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            const verifyResponse = await request(app)
                .post('/api/payments/verify')
                .set('x-user-id', buyer._id.toString())
                .send({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature
                });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.success).toBe(true);
            expect(verifyResponse.body.data.coupon.code).toBe('TEST123');

            // Step 3: Verify all database updates
            transaction = await Transaction.findById(transaction._id);
            expect(transaction.paymentStatus).toBe('completed');
            expect(transaction.razorpayPaymentId).toBe(paymentId);

            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(true);
            expect(updatedCoupon.status).toBe('sold');
            expect(updatedCoupon.buyerId.toString()).toBe(buyer._id.toString());

            const updatedSeller = await User.findById(seller._id);
            const updatedBuyer = await User.findById(buyer._id);
            expect(updatedSeller.totalCouponsSold).toBe(1);
            expect(updatedBuyer.totalCouponsBought).toBe(1);

            const notifications = await Notification.find({});
            expect(notifications.length).toBe(2);
            expect(notifications.some(n => n.userId.toString() === buyer._id.toString() && n.type === 'purchase')).toBe(true);
            expect(notifications.some(n => n.userId.toString() === seller._id.toString() && n.type === 'sale')).toBe(true);
        });

        test('should handle payment failure gracefully', async () => {
            // Create order
            const createOrderResponse = await request(app)
                .post('/api/payments/create-order')
                .set('x-user-id', buyer._id.toString())
                .send({ couponId: coupon._id.toString() });

            expect(createOrderResponse.status).toBe(201);
            const orderId = createOrderResponse.body.data.orderId;

            // Try to verify with invalid signature
            const paymentId = 'pay_failed_test';
            const wrongSignature = crypto
                .createHmac('sha256', 'wrong_secret')
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            const verifyResponse = await request(app)
                .post('/api/payments/verify')
                .set('x-user-id', buyer._id.toString())
                .send({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: wrongSignature
                });

            expect(verifyResponse.status).toBe(400);
            expect(verifyResponse.body.error.code).toBe('INVALID_SIGNATURE');

            // Verify coupon is still available
            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(false);
            expect(updatedCoupon.status).toBe('approved');
        });
    });

    describe('Webhook Delivery and Processing', () => {
        test('should process payment.captured webhook and update database', async () => {
            // Create a pending transaction
            const transaction = await Transaction.create({
                buyerId: buyer._id,
                sellerId: seller._id,
                couponId: coupon._id,
                amount: 100,
                razorpayOrderId: 'order_webhook_test',
                paymentStatus: 'pending',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
            });

            // Send webhook
            const webhookBody = {
                event: 'payment.captured',
                payload: {
                    payment: {
                        entity: {
                            id: 'pay_webhook_test',
                            order_id: 'order_webhook_test',
                            amount: 10000,
                            status: 'captured'
                        }
                    }
                }
            };

            const signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
                .update(JSON.stringify(webhookBody))
                .digest('hex');

            const response = await request(app)
                .post('/api/payments/webhook')
                .set('x-razorpay-signature', signature)
                .send(webhookBody);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify database updates
            const updatedTransaction = await Transaction.findById(transaction._id);
            expect(updatedTransaction.paymentStatus).toBe('completed');
            expect(updatedTransaction.razorpayPaymentId).toBe('pay_webhook_test');

            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(true);
            expect(updatedCoupon.status).toBe('sold');

            const updatedSeller = await User.findById(seller._id);
            const updatedBuyer = await User.findById(buyer._id);
            expect(updatedSeller.totalCouponsSold).toBe(1);
            expect(updatedBuyer.totalCouponsBought).toBe(1);

            const notifications = await Notification.find({});
            expect(notifications.length).toBe(2);
        });

        test('should process payment.failed webhook correctly', async () => {
            // Create a pending transaction
            const transaction = await Transaction.create({
                buyerId: buyer._id,
                sellerId: seller._id,
                couponId: coupon._id,
                amount: 100,
                razorpayOrderId: 'order_failed_webhook',
                paymentStatus: 'pending',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
            });

            // Send webhook
            const webhookBody = {
                event: 'payment.failed',
                payload: {
                    payment: {
                        entity: {
                            id: 'pay_failed_webhook',
                            order_id: 'order_failed_webhook',
                            status: 'failed'
                        }
                    }
                }
            };

            const signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
                .update(JSON.stringify(webhookBody))
                .digest('hex');

            const response = await request(app)
                .post('/api/payments/webhook')
                .set('x-razorpay-signature', signature)
                .send(webhookBody);

            expect(response.status).toBe(200);

            // Verify transaction status
            const updatedTransaction = await Transaction.findById(transaction._id);
            expect(updatedTransaction.paymentStatus).toBe('failed');

            // Verify coupon is still available
            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(false);

            // Verify failure notification was created
            const notification = await Notification.findOne({
                userId: buyer._id,
                type: 'warning'
            });
            expect(notification).toBeTruthy();
        });

        test('should process refund.processed webhook correctly', async () => {
            // Create a completed transaction
            const transaction = await Transaction.create({
                buyerId: buyer._id,
                sellerId: seller._id,
                couponId: coupon._id,
                amount: 100,
                razorpayOrderId: 'order_refund_webhook',
                razorpayPaymentId: 'pay_refund_webhook',
                paymentStatus: 'completed',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
            });

            // Mark coupon as sold
            coupon.isSold = true;
            coupon.buyerId = buyer._id;
            coupon.status = 'sold';
            await coupon.save();

            // Send webhook
            const webhookBody = {
                event: 'refund.processed',
                payload: {
                    refund: {
                        entity: {
                            id: 'rfnd_webhook_test',
                            payment_id: 'pay_refund_webhook',
                            amount: 10000,
                            status: 'processed'
                        }
                    }
                }
            };

            const signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
                .update(JSON.stringify(webhookBody))
                .digest('hex');

            const response = await request(app)
                .post('/api/payments/webhook')
                .set('x-razorpay-signature', signature)
                .send(webhookBody);

            expect(response.status).toBe(200);

            // Verify transaction status
            const updatedTransaction = await Transaction.findById(transaction._id);
            expect(updatedTransaction.paymentStatus).toBe('refunded');
            expect(updatedTransaction.razorpayRefundId).toBe('rfnd_webhook_test');

            // Verify coupon is available again
            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(false);
            expect(updatedCoupon.buyerId).toBeNull();
            expect(updatedCoupon.status).toBe('approved');

            // Verify refund notifications were created
            const notifications = await Notification.find({});
            expect(notifications.length).toBe(2);
        });
    });

    describe('Complete Refund Flow', () => {
        test('should complete full refund flow from initiation to processing', async () => {
            // Step 1: Create and complete a transaction
            const transaction = await Transaction.create({
                buyerId: buyer._id,
                sellerId: seller._id,
                couponId: coupon._id,
                amount: 100,
                razorpayOrderId: 'order_refund_flow',
                razorpayPaymentId: 'pay_refund_flow',
                paymentStatus: 'completed',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
            });

            // Mark coupon as sold
            coupon.isSold = true;
            coupon.buyerId = buyer._id;
            coupon.status = 'sold';
            await coupon.save();

            // Update seller stats
            seller.totalCouponsSold = 1;
            await seller.save();

            // Step 2: Initiate refund
            const refundResponse = await request(app)
                .post(`/api/payments/refund/${transaction._id}`)
                .set('x-user-id', buyer._id.toString())
                .send({ reason: 'Coupon code not working' });

            expect(refundResponse.status).toBe(200);
            expect(refundResponse.body.success).toBe(true);
            expect(refundResponse.body.data.refundId).toBe('rfnd_integration_test');

            // Step 3: Verify all database updates
            const updatedTransaction = await Transaction.findById(transaction._id);
            expect(updatedTransaction.paymentStatus).toBe('refunded');
            expect(updatedTransaction.razorpayRefundId).toBe('rfnd_integration_test');
            expect(updatedTransaction.disputeReason).toBe('Coupon code not working');

            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(false);
            expect(updatedCoupon.buyerId).toBeNull();
            expect(updatedCoupon.status).toBe('approved');

            const updatedSeller = await User.findById(seller._id);
            expect(updatedSeller.trustScore).toBe(50); // Decreased by 50
            expect(updatedSeller.warningsCount).toBe(1);
            expect(updatedSeller.isBanned).toBe(false);

            // Verify notifications
            const notifications = await Notification.find({});
            expect(notifications.length).toBe(2);
            expect(notifications.some(n => n.userId.toString() === buyer._id.toString())).toBe(true);
            expect(notifications.some(n => n.userId.toString() === seller._id.toString())).toBe(true);
        });

        test('should ban seller after multiple refunds', async () => {
            // Create seller with 2 warnings
            seller.warningsCount = 2;
            seller.trustScore = 30;
            await seller.save();

            // Create and complete a transaction
            const transaction = await Transaction.create({
                buyerId: buyer._id,
                sellerId: seller._id,
                couponId: coupon._id,
                amount: 100,
                razorpayOrderId: 'order_ban_test',
                razorpayPaymentId: 'pay_ban_test',
                paymentStatus: 'completed',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
            });

            coupon.isSold = true;
            coupon.buyerId = buyer._id;
            coupon.status = 'sold';
            await coupon.save();

            // Initiate refund (3rd warning)
            const refundResponse = await request(app)
                .post(`/api/payments/refund/${transaction._id}`)
                .set('x-user-id', buyer._id.toString())
                .send({ reason: 'Fraudulent coupon' });

            expect(refundResponse.status).toBe(200);

            // Verify seller was banned
            const updatedSeller = await User.findById(seller._id);
            expect(updatedSeller.isBanned).toBe(true);
            expect(updatedSeller.warningsCount).toBe(3);

            // Verify ban notification was created
            const banNotification = await Notification.findOne({
                userId: seller._id,
                type: 'ban'
            });
            expect(banNotification).toBeTruthy();
            expect(banNotification.title).toBe('Account Banned');
        });
    });

    describe('Concurrent Payment Scenarios', () => {
        test('should prevent double purchase of same coupon', async () => {
            // Mock Razorpay to create different order IDs
            razorpayInstance.orders.create
                .mockResolvedValueOnce({
                    id: 'order_concurrent_1',
                    amount: 10000,
                    currency: 'INR'
                })
                .mockResolvedValueOnce({
                    id: 'order_concurrent_2',
                    amount: 10000,
                    currency: 'INR'
                });

            // Create two orders for the same coupon
            const order1Response = await request(app)
                .post('/api/payments/create-order')
                .set('x-user-id', buyer._id.toString())
                .send({ couponId: coupon._id.toString() });

            expect(order1Response.status).toBe(201);

            // Complete first payment
            const paymentId1 = 'pay_concurrent_1';
            const signature1 = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`order_concurrent_1|${paymentId1}`)
                .digest('hex');

            const verifyResponse = await request(app)
                .post('/api/payments/verify')
                .set('x-user-id', buyer._id.toString())
                .send({
                    razorpay_order_id: 'order_concurrent_1',
                    razorpay_payment_id: paymentId1,
                    razorpay_signature: signature1
                });

            expect(verifyResponse.status).toBe(200);

            // Verify coupon is now sold
            const updatedCoupon = await Coupon.findById(coupon._id);
            expect(updatedCoupon.isSold).toBe(true);

            // Try to create second order for same coupon (should fail)
            const order2Response = await request(app)
                .post('/api/payments/create-order')
                .set('x-user-id', buyer._id.toString())
                .send({ couponId: coupon._id.toString() });

            expect(order2Response.status).toBe(400);
            // Note: Controller checks status before isSold, so 'sold' status returns COUPON_NOT_APPROVED
            expect(order2Response.body.error.code).toBe('COUPON_NOT_APPROVED');
        });
    });
});
