const express = require('express');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All notification routes require authentication
router.get('/', verifyToken, getNotifications);
router.patch('/read/:id', verifyToken, markAsRead);
router.patch('/read-all', verifyToken, markAllAsRead);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;
