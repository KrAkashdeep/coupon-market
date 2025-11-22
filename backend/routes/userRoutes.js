const express = require('express');
const {
    getProfile,
    updateProfile,
    getSellerProfile,
    getAllUsers,
    banUser,
    unbanUser,
    adjustTrustScore
} = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes - require authentication
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);

// Public route - get seller profile
router.get('/seller/:id', getSellerProfile);

// Admin routes - require authentication and admin role
router.get('/all', verifyToken, isAdmin, getAllUsers);
router.patch('/ban/:id', verifyToken, isAdmin, banUser);
router.patch('/unban/:id', verifyToken, isAdmin, unbanUser);
router.patch('/trust/:id', verifyToken, isAdmin, adjustTrustScore);

module.exports = router;
