const User = require('../models/User');

// GET /api/users/profile - Get authenticated user's full profile
const getProfile = async (req, res, next) => {
    try {
        // Fetch user from database (req.user.id is set by authMiddleware)
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Calculate trust badge
        const trustBadge = user.getTrustBadge();

        // Return full profile
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                totalCouponsSold: user.totalCouponsSold,
                totalCouponsBought: user.totalCouponsBought,
                trustScore: user.trustScore,
                trustBadge: trustBadge,
                warningsCount: user.warningsCount,
                isBanned: user.isBanned,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/profile - Update authenticated user's name and avatar
const updateProfile = async (req, res, next) => {
    try {
        const { name, avatar } = req.body;

        // Fetch user from database
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Update only allowed fields
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Name cannot be empty'
                    }
                });
            }
            user.name = name.trim();
        }

        if (avatar !== undefined) {
            user.avatar = avatar;
        }

        await user.save();

        // Calculate trust badge
        const trustBadge = user.getTrustBadge();

        // Return updated profile (without password)
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                totalCouponsSold: user.totalCouponsSold,
                totalCouponsBought: user.totalCouponsBought,
                trustScore: user.trustScore,
                trustBadge: trustBadge,
                warningsCount: user.warningsCount,
                isBanned: user.isBanned,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/seller/:id - Get public seller profile
const getSellerProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch seller from database
        const seller = await User.findById(id).select('-password -email');

        if (!seller) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'Seller not found'
                }
            });
        }

        // Calculate trust badge
        const trustBadge = seller.getTrustBadge();

        // Return public seller profile
        res.status(200).json({
            success: true,
            seller: {
                id: seller._id,
                name: seller.name,
                avatar: seller.avatar,
                totalCouponsSold: seller.totalCouponsSold,
                trustScore: seller.trustScore,
                trustBadge: trustBadge,
                warningsCount: seller.warningsCount,
                createdAt: seller.createdAt
            }
        });
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid seller ID format'
                }
            });
        }
        next(error);
    }
};

// GET /api/users/all - Get all users (admin only)
const getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, banned, lowTrust } = req.query;

        // Build filter
        const filter = {};
        if (banned === 'true') {
            filter.isBanned = true;
        } else if (banned === 'false') {
            filter.isBanned = false;
        }
        if (lowTrust === 'true') {
            filter.trustScore = { $lt: 50 };
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Fetch users with pagination
        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await User.countDocuments(filter);

        // Add trust badge to each user
        const usersWithBadge = users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            totalCouponsSold: user.totalCouponsSold,
            totalCouponsBought: user.totalCouponsBought,
            trustScore: user.trustScore,
            trustBadge: user.getTrustBadge(),
            warningsCount: user.warningsCount,
            isBanned: user.isBanned,
            createdAt: user.createdAt
        }));

        res.status(200).json({
            success: true,
            users: usersWithBadge,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/ban/:id - Ban a user (admin only)
const banUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Fetch user from database
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Prevent banning admins
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CANNOT_BAN_ADMIN',
                    message: 'Cannot ban admin users'
                }
            });
        }

        // Check if already banned
        if (user.isBanned) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_BANNED',
                    message: 'User is already banned'
                }
            });
        }

        // Ban the user
        user.isBanned = true;
        await user.save();

        // Create ban notification
        const { notifyBan } = require('../utils/notificationHelper');
        await notifyBan(user._id, reason || 'administrative action', false);

        // Log admin action
        console.log(`[ADMIN ACTION] User ${user.email} (ID: ${user._id}) banned by admin ${req.user.email} (ID: ${req.user.id}). Reason: ${reason || 'No reason provided'}`);

        res.status(200).json({
            success: true,
            message: 'User banned successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isBanned: user.isBanned
            }
        });
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid user ID format'
                }
            });
        }
        next(error);
    }
};

// PATCH /api/users/unban/:id - Unban a user (admin only)
const unbanUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch user from database
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Check if not banned
        if (!user.isBanned) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'NOT_BANNED',
                    message: 'User is not banned'
                }
            });
        }

        // Unban the user
        user.isBanned = false;
        await user.save();

        // Log admin action
        console.log(`[ADMIN ACTION] User ${user.email} (ID: ${user._id}) unbanned by admin ${req.user.email} (ID: ${req.user.id})`);

        res.status(200).json({
            success: true,
            message: 'User unbanned successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isBanned: user.isBanned
            }
        });
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid user ID format'
                }
            });
        }
        next(error);
    }
};

// PATCH /api/users/trust/:id - Manually adjust user trust score (admin only)
const adjustTrustScore = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { trustScore, reason } = req.body;

        // Validate trust score
        if (trustScore === undefined || trustScore === null) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Trust score is required'
                }
            });
        }

        if (typeof trustScore !== 'number' || trustScore < 0 || trustScore > 100) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Trust score must be a number between 0 and 100'
                }
            });
        }

        // Fetch user from database
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        const oldTrustScore = user.trustScore;

        // Update trust score
        user.trustScore = trustScore;
        await user.save();

        // Log admin action
        console.log(`[ADMIN ACTION] User ${user.email} (ID: ${user._id}) trust score adjusted from ${oldTrustScore} to ${trustScore} by admin ${req.user.email} (ID: ${req.user.id}). Reason: ${reason || 'No reason provided'}`);

        // Calculate trust badge
        const trustBadge = user.getTrustBadge();

        res.status(200).json({
            success: true,
            message: 'Trust score updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                trustScore: user.trustScore,
                trustBadge: trustBadge,
                warningsCount: user.warningsCount
            }
        });
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid user ID format'
                }
            });
        }
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getSellerProfile,
    getAllUsers,
    banUser,
    unbanUser,
    adjustTrustScore
};
