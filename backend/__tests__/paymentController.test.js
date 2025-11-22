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

describe('Payment Controller - createOrder', () => {
    let seller, buyer, coupon;

    beforeEach(async () => {
        // Create test users
        seller = await User.create({
            name: 'Seller User',
            email: 'seller@test.com',
            password: 'hashedpassword',
            role: 'user'
        });

        buyer = await User.create({
            name: 'Buyer User',
            email: 'buyer@test.com',
            password: 'hashedpassword',
            role: 'user'
        });

        // Create test coupon
        coupon = await Coupon.create({
            title: 'Test Coupon',
            storeName: 'Test Store',
            description: 'Test Description',
            discountPercent: 50,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            price: 100,
            code: 'TEST123',
            sellerId: seller._id,
            status: 'approved',
            isSold: false
        });

        // Mock Razorpay order creation
        razorpayInstance.orders.create.mockResolvedValue({
            id: 'order_test123',
            amount: 10000,
            currency: 'INR'
        });
    });

    test('should create order successfully with valid coupon', async () => {
        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', buyer._id.toString())
            .send({ couponId: coupon._id.toString() });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.orderId).toBe('order_test123');
        expect(response.body.data.amount).toBe(10000);
        expect(response.body.data.currency).toBe('INR');

        // Verify transaction was created
        const transaction = await Transaction.findOne({ razorpayOrderId: 'order_test123' });
        expect(transaction).toBeTruthy();
        expect(transaction.paymentStatus).toBe('pending');
    });

    test('should fail when coupon ID is missing', async () => {
        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', buyer._id.toString())
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_COUPON_ID');
    });

    test('should fail when coupon does not exist', async () => {
        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', buyer._id.toString())
            .send({ couponId: '507f1f77bcf86cd799439011' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    test('should fail when coupon is already sold', async () => {
        coupon.isSold = true;
        await coupon.save();

        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', buyer._id.toString())
            .send({ couponId: coupon._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COUPON_ALREADY_SOLD');
    });

    test('should fail when coupon is not approved', async () => {
        coupon.status = 'pending_verification';
        await coupon.save();

        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', buyer._id.toString())
            .send({ couponId: coupon._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COUPON_NOT_APPROVED');
    });

    test('should fail when coupon is expired', async () => {
        coupon.expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
        await coupon.save();

        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', buyer._id.toString())
            .send({ couponId: coupon._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COUPON_EXPIRED');
    });

    test('should fail when buyer tries to purchase own coupon', async () => {
        const response = await request(app)
            .post('/api/payments/create-order')
            .set('x-user-id', seller._id.toString())
            .send({ couponId: coupon._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CANNOT_BUY_OWN_COUPON');
    });
});

describe('Payment Controller - verifyPayment', () => {
    let seller, buyer, coupon, transaction;

    beforeEach(async () => {
        // Set environment variable for signature verification
        process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';

        // Create test users
        seller = await User.create({
            name: 'Seller User',
            email: 'seller@test.com',
            password: 'hashedpassword',
            role: 'user',
            totalCouponsSold: 0
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

        // Create test transaction
        transaction = await Transaction.create({
            buyerId: buyer._id,
            sellerId: seller._id,
            couponId: coupon._id,
            amount: 100,
            razorpayOrderId: 'order_test123',
            paymentStatus: 'pending',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
    });

    test('should verify payment successfully with valid signature', async () => {
        const orderId = 'order_test123';
        const paymentId = 'pay_test123';

        // Generate valid signature
        const signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const response = await request(app)
            .post('/api/payments/verify')
            .set('x-user-id', buyer._id.toString())
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.transaction.status).toBe('completed');
        expect(response.body.data.coupon.code).toBe('TEST123');

        // Verify transaction was updated
        const updatedTransaction = await Transaction.findById(transaction._id);
        expect(updatedTransaction.paymentStatus).toBe('completed');
        expect(updatedTransaction.razorpayPaymentId).toBe(paymentId);

        // Verify coupon was marked as sold
        const updatedCoupon = await Coupon.findById(coupon._id);
        expect(updatedCoupon.isSold).toBe(true);
        expect(updatedCoupon.status).toBe('sold');
        expect(updatedCoupon.buyerId.toString()).toBe(buyer._id.toString());

        // Verify user statistics were updated
        const updatedSeller = await User.findById(seller._id);
        const updatedBuyer = await User.findById(buyer._id);
        expect(updatedSeller.totalCouponsSold).toBe(1);
        expect(updatedBuyer.totalCouponsBought).toBe(1);

        // Verify notifications were created
        const notifications = await Notification.find({});
        expect(notifications.length).toBe(2);
    });

    test('should fail with invalid signature', async () => {
        const orderId = 'order_test123';
        const paymentId = 'pay_test123';

        // Generate a valid length signature but with wrong content
        const wrongSignature = crypto
            .createHmac('sha256', 'wrong_secret')
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const response = await request(app)
            .post('/api/payments/verify')
            .set('x-user-id', buyer._id.toString())
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: wrongSignature
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    test('should fail when payment details are missing', async () => {
        const response = await request(app)
            .post('/api/payments/verify')
            .set('x-user-id', buyer._id.toString())
            .send({
                razorpay_order_id: 'order_test123'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_PAYMENT_DETAILS');
    });

    test('should fail when transaction not found', async () => {
        const orderId = 'order_nonexistent';
        const paymentId = 'pay_test123';

        const signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const response = await request(app)
            .post('/api/payments/verify')
            .set('x-user-id', buyer._id.toString())
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature
            });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });

    test('should fail when payment already processed', async () => {
        transaction.paymentStatus = 'completed';
        await transaction.save();

        const orderId = 'order_test123';
        const paymentId = 'pay_test123';

        const signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const response = await request(app)
            .post('/api/payments/verify')
            .set('x-user-id', buyer._id.toString())
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ALREADY_PROCESSED');
    });
});

describe('Payment Controller - handleWebhook', () => {
    let seller, buyer, coupon, transaction;

    beforeEach(async () => {
        process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret';

        seller = await User.create({
            name: 'Seller User',
            email: 'seller@test.com',
            password: 'hashedpassword',
            role: 'user',
            totalCouponsSold: 0
        });

        buyer = await User.create({
            name: 'Buyer User',
            email: 'buyer@test.com',
            password: 'hashedpassword',
            role: 'user',
            totalCouponsBought: 0
        });

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

        transaction = await Transaction.create({
            buyerId: buyer._id,
            sellerId: seller._id,
            couponId: coupon._id,
            amount: 100,
            razorpayOrderId: 'order_test123',
            paymentStatus: 'pending',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
    });

    test('should process payment.captured event successfully', async () => {
        const webhookBody = {
            event: 'payment.captured',
            payload: {
                payment: {
                    entity: {
                        id: 'pay_test123',
                        order_id: 'order_test123',
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

        // Verify transaction was updated
        const updatedTransaction = await Transaction.findById(transaction._id);
        expect(updatedTransaction.paymentStatus).toBe('completed');
        expect(updatedTransaction.razorpayPaymentId).toBe('pay_test123');

        // Verify coupon was marked as sold
        const updatedCoupon = await Coupon.findById(coupon._id);
        expect(updatedCoupon.isSold).toBe(true);
    });

    test('should process payment.failed event successfully', async () => {
        const webhookBody = {
            event: 'payment.failed',
            payload: {
                payment: {
                    entity: {
                        id: 'pay_test123',
                        order_id: 'order_test123',
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

        // Verify transaction was updated
        const updatedTransaction = await Transaction.findById(transaction._id);
        expect(updatedTransaction.paymentStatus).toBe('failed');
    });

    test('should fail with invalid webhook signature', async () => {
        const webhookBody = {
            event: 'payment.captured',
            payload: {}
        };

        // Generate a valid length signature but with wrong secret
        const wrongSignature = crypto
            .createHmac('sha256', 'wrong_webhook_secret')
            .update(JSON.stringify(webhookBody))
            .digest('hex');

        const response = await request(app)
            .post('/api/payments/webhook')
            .set('x-razorpay-signature', wrongSignature)
            .send(webhookBody);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    test('should fail when webhook signature is missing', async () => {
        const response = await request(app)
            .post('/api/payments/webhook')
            .send({ event: 'payment.captured', payload: {} });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_SIGNATURE');
    });
});

describe('Payment Controller - initiateRefund', () => {
    let seller, buyer, coupon, transaction;

    beforeEach(async () => {
        seller = await User.create({
            name: 'Seller User',
            email: 'seller@test.com',
            password: 'hashedpassword',
            role: 'user',
            trustScore: 100,
            warningsCount: 0
        });

        buyer = await User.create({
            name: 'Buyer User',
            email: 'buyer@test.com',
            password: 'hashedpassword',
            role: 'user'
        });

        coupon = await Coupon.create({
            title: 'Test Coupon',
            storeName: 'Test Store',
            description: 'Test Description',
            discountPercent: 50,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            price: 100,
            code: 'TEST123',
            sellerId: seller._id,
            buyerId: buyer._id,
            status: 'sold',
            isSold: true
        });

        transaction = await Transaction.create({
            buyerId: buyer._id,
            sellerId: seller._id,
            couponId: coupon._id,
            amount: 100,
            razorpayOrderId: 'order_test123',
            razorpayPaymentId: 'pay_test123',
            paymentStatus: 'completed',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        // Mock Razorpay refund
        razorpayInstance.payments.refund.mockResolvedValue({
            id: 'rfnd_test123',
            amount: 10000,
            status: 'processed'
        });
    });

    test('should initiate refund successfully', async () => {
        const response = await request(app)
            .post(`/api/payments/refund/${transaction._id}`)
            .set('x-user-id', buyer._id.toString())
            .send({ reason: 'Coupon code not working' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.refundId).toBe('rfnd_test123');

        // Verify transaction was updated
        const updatedTransaction = await Transaction.findById(transaction._id);
        expect(updatedTransaction.paymentStatus).toBe('refunded');
        expect(updatedTransaction.razorpayRefundId).toBe('rfnd_test123');

        // Verify coupon was marked as available
        const updatedCoupon = await Coupon.findById(coupon._id);
        expect(updatedCoupon.isSold).toBe(false);
        expect(updatedCoupon.buyerId).toBeNull();

        // Verify seller trust score was decreased
        const updatedSeller = await User.findById(seller._id);
        expect(updatedSeller.trustScore).toBe(50);
        expect(updatedSeller.warningsCount).toBe(1);
    });

    test('should fail when transaction not found', async () => {
        const response = await request(app)
            .post('/api/payments/refund/507f1f77bcf86cd799439011')
            .set('x-user-id', buyer._id.toString())
            .send({ reason: 'Test reason' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });

    test('should fail when transaction is not completed', async () => {
        transaction.paymentStatus = 'pending';
        await transaction.save();

        const response = await request(app)
            .post(`/api/payments/refund/${transaction._id}`)
            .set('x-user-id', buyer._id.toString())
            .send({ reason: 'Test reason' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_TRANSACTION_STATUS');
    });

    test('should fail when user is not the buyer', async () => {
        const response = await request(app)
            .post(`/api/payments/refund/${transaction._id}`)
            .set('x-user-id', seller._id.toString())
            .send({ reason: 'Test reason' });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should fail when refund already processed', async () => {
        transaction.razorpayRefundId = 'rfnd_existing';
        await transaction.save();

        const response = await request(app)
            .post(`/api/payments/refund/${transaction._id}`)
            .set('x-user-id', buyer._id.toString())
            .send({ reason: 'Test reason' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ALREADY_REFUNDED');
    });

    test('should ban seller after 3 warnings', async () => {
        seller.warningsCount = 2;
        await seller.save();

        const response = await request(app)
            .post(`/api/payments/refund/${transaction._id}`)
            .set('x-user-id', buyer._id.toString())
            .send({ reason: 'Coupon code not working' });

        expect(response.status).toBe(200);

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
    });
});
