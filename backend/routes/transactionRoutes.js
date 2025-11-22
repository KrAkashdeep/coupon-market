const express = require('express');
const {
    createTransaction,
    confirmTransaction,
    disputeTransaction,
    getMyTransactions,
    getTransactionById,
    getUserTransactions
} = require('../controllers/transactionController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// All transaction routes require authentication
router.post('/create', verifyToken, createTransaction);
router.post('/confirm/:id', verifyToken, confirmTransaction);
router.post('/dispute/:id', verifyToken, disputeTransaction);
router.get('/my', verifyToken, getMyTransactions);

// Admin routes
router.get('/user/:userId', verifyToken, isAdmin, getUserTransactions);

// Must be last to avoid conflicts with other routes
router.get('/:id', verifyToken, getTransactionById);

module.exports = router;
