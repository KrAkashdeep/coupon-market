const express = require('express');
const {
  createCoupon,
  uploadCoupon,
  getMyCoupons,
  getAllCoupons,
  getCouponById,
  buyCoupon,
  deleteCoupon,
  getPendingCoupons,
  approveCoupon,
  rejectCoupon
} = require('../controllers/couponController');
const { verifyToken, isNotBanned, isAdmin } = require('../middleware/authMiddleware');
const { validateImage, uploadToCloudinary } = require('../middleware/uploadMiddleware');
const { processOCR, compareCode } = require('../middleware/ocrMiddleware');

const router = express.Router();

// Protected routes (require authentication)
router.post('/create', verifyToken, createCoupon);

// Enhanced upload route with image upload, OCR processing, and verification
router.post(
  '/upload',
  verifyToken,
  isNotBanned,
  validateImage,
  uploadToCloudinary,
  processOCR,
  compareCode,
  uploadCoupon
);

// Admin routes (must be before parameterized routes)
router.get('/pending', verifyToken, isAdmin, getPendingCoupons);
router.patch('/approve/:id', verifyToken, isAdmin, approveCoupon);
router.patch('/reject/:id', verifyToken, isAdmin, rejectCoupon);

// Protected routes (require authentication)
router.get('/my', verifyToken, getMyCoupons);
router.put('/buy/:id', verifyToken, buyCoupon);
router.delete('/:id', verifyToken, deleteCoupon);

// Public routes (no authentication required for browsing)
router.get('/', getAllCoupons);

// Public route for single coupon (must be last to avoid conflicts)
router.get('/:id', getCouponById);

module.exports = router;
