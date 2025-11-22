const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Get user's notifications with pagination and filtering
const getNotifications = async (req, res, next) => {
    try {
        // Get pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build query
        const query = { userId: req.user.id };

        // Add type filter if provided
        if (req.query.type) {
            const validTypes = ['purchase', 'sale', 'warning', 'ban', 'approval', 'rejection'];
            if (validTypes.includes(req.query.type)) {
                query.type = req.query.type;
            }
        }

        // Add isRead filter if provided
        if (req.query.isRead !== undefined) {
            query.isRead = req.query.isRead === 'true';
        }

        // Find notifications with pagination
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalCount = await Notification.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false
        });

        res.status(200).json({
            success: true,
            notifications,
            unreadCount,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        next(error);
    }
};

// Mark single notification as read
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid notification ID format'
                }
            });
        }

        // Find the notification
        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notification not found'
                }
            });
        }

        // Verify notification belongs to authenticated user
        if (notification.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to modify this notification'
                }
            });
        }

        // Update isRead to true
        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        next(error);
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
    try {
        // Update all unread notifications for the user
        const result = await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        next(error);
    }
};

// Delete notification
const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid notification ID format'
                }
            });
        }

        // Find the notification
        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notification not found'
                }
            });
        }

        // Verify notification belongs to authenticated user
        if (notification.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to delete this notification'
                }
            });
        }

        // Delete the notification
        await Notification.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
