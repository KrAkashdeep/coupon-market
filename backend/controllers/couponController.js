const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');

// Create a new coupon
const createCoupon = async (req, res, next) => {
  try {
    const { title, storeName, description, discountPercent, expiryDate, price, code } = req.body;

    // Validate required fields
    if (!title || !storeName || !description || !discountPercent || !expiryDate || !price || !code) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate discount percentage range
    if (discountPercent < 1 || discountPercent > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 1 and 100' });
    }

    // Validate price is non-negative
    if (price < 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Validate expiry date is in the future
    const expiryDateObj = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison

    if (expiryDateObj < today) {
      return res.status(400).json({ error: 'Expiry date must be in the future' });
    }

    // Create new coupon
    const coupon = new Coupon({
      title,
      storeName,
      description,
      discountPercent,
      expiryDate: expiryDateObj,
      price,
      code,
      sellerId: req.user.id,
      isSold: false,
      buyerId: null
    });

    await coupon.save();

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    next(error);
  }
};

// Upload coupon with screenshot for manual admin verification
const uploadCoupon = async (req, res, next) => {
  try {
    const { code, brand, expiryDate, price, title, description, discountPercent, discountAmount } = req.body;

    // Validate required fields
    if (!code || !brand || !expiryDate || !price) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required: code, brand, expiryDate, price, screenshot'
        }
      });
    }

    // Validate at least one discount field is provided
    if (!discountPercent && !discountAmount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either discount percentage or discount amount is required'
        }
      });
    }

    // Validate price is positive
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Price must be a positive number'
        }
      });
    }

    // Validate expiry date is in the future
    const expiryDateObj = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(expiryDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid expiry date format'
        }
      });
    }

    if (expiryDateObj < today) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Expiry date must be in the future'
        }
      });
    }

    // Check if screenshot was uploaded (should be set by uploadMiddleware)
    if (!req.cloudinaryResult || !req.cloudinaryResult.url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Screenshot is required'
        }
      });
    }

    // Create new coupon with screenshot for manual admin verification
    const couponData = {
      title: title || `${brand} Coupon`,
      storeName: brand,
      description: description || `Coupon code: ${code}`,
      expiryDate: expiryDateObj,
      price: priceNum,
      code: code.trim(),
      sellerId: req.user.id,
      screenshotURL: req.cloudinaryResult.url,
      status: 'pending_verification',
      isSold: false,
      buyerId: null
    };

    // Add discount fields only if provided
    if (discountPercent) {
      couponData.discountPercent = parseFloat(discountPercent);
    }
    if (discountAmount) {
      couponData.discountAmount = parseFloat(discountAmount);
    }

    const coupon = new Coupon(couponData);

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon uploaded successfully and is pending manual verification by admin',
      coupon: {
        id: coupon._id,
        code: coupon.code,
        brand: coupon.storeName,
        expiryDate: coupon.expiryDate,
        price: coupon.price,
        screenshotURL: coupon.screenshotURL,
        status: coupon.status,
        createdAt: coupon.createdAt
      }
    });
  } catch (error) {
    console.error('Upload coupon error:', error);
    next(error);
  }
};

// Get coupons created by the authenticated user
const getMyCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ sellerId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({ coupons });
  } catch (error) {
    next(error);
  }
};

// Get single coupon by ID
const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coupon ID'
      });
    }

    // Find the coupon and populate seller information
    const coupon = await Coupon.findById(id)
      .populate('sellerId', 'name email trustScore warningsCount totalCouponsSold');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('Get coupon by ID error:', error);
    next(error);
  }
};

// Get all available coupons (excluding user's own and sold coupons)
const getAllCoupons = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;

    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get sorting parameters from query string
    const sortBy = req.query.sortBy || 'createdAt'; // Default sort by createdAt
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // Default descending

    // Build query to filter approved, not sold, and not expired coupons
    const query = {
      status: 'approved',
      isSold: false,
      expiryDate: { $gt: new Date() } // Filter out expired coupons
    };

    // Optionally exclude user's own coupons if authenticated
    if (userId) {
      query.sellerId = { $ne: userId };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    // Query coupons with population and pagination
    const coupons = await Coupon.find(query)
      .populate('sellerId', 'name trustScore warningsCount')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      coupons,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// Buy a coupon
const buyCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    // Find the coupon
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check if coupon is already sold
    if (coupon.isSold) {
      return res.status(400).json({ error: 'Coupon is already sold' });
    }

    // Check if user is trying to buy their own coupon
    if (coupon.sellerId.toString() === req.user.id) {
      return res.status(403).json({ error: 'You cannot buy your own coupon' });
    }

    // Update coupon
    coupon.isSold = true;
    coupon.buyerId = req.user.id;
    await coupon.save();

    res.status(200).json({
      message: 'Coupon purchased successfully',
      coupon
    });
  } catch (error) {
    next(error);
  }
};

// Delete a coupon
const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    // Find the coupon
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check if user is the owner
    if (coupon.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this coupon' });
    }

    // Delete the coupon
    await Coupon.findByIdAndDelete(id);

    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get pending coupons for admin verification
const getPendingCoupons = async (req, res, next) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Query coupons with status 'pending_verification'
    const coupons = await Coupon.find({ status: 'pending_verification' })
      .populate('sellerId', 'name email trustScore warningsCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Coupon.countDocuments({ status: 'pending_verification' });
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      coupons,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      }
    });
  } catch (error) {
    console.error('Get pending coupons error:', error);
    next(error);
  }
};

// Approve a coupon (admin only)
const approveCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid coupon ID'
        }
      });
    }

    // Find the coupon
    const coupon = await Coupon.findById(id).populate('sellerId', 'name email');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: 'Coupon not found'
        }
      });
    }

    // Verify status is 'pending_verification'
    if (coupon.status !== 'pending_verification') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Coupon status must be 'pending_verification' to approve. Current status: ${coupon.status}`
        }
      });
    }

    // Update status to 'approved'
    coupon.status = 'approved';
    await coupon.save();

    // Create notification for seller about approval
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: coupon.sellerId._id,
      type: 'approval',
      title: 'Coupon Approved',
      message: `Your coupon "${coupon.storeName} - ${coupon.code}" has been approved and is now visible in the marketplace.`,
      relatedId: coupon._id
    });

    res.status(200).json({
      success: true,
      message: 'Coupon approved successfully',
      coupon: {
        id: coupon._id,
        code: coupon.code,
        brand: coupon.storeName,
        status: coupon.status,
        seller: {
          name: coupon.sellerId.name,
          email: coupon.sellerId.email
        }
      }
    });
  } catch (error) {
    console.error('Approve coupon error:', error);
    next(error);
  }
};

// Reject a coupon (admin only)
const rejectCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid coupon ID'
        }
      });
    }

    // Validate rejection reason is provided
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rejection reason is required'
        }
      });
    }

    // Find the coupon and populate seller
    const coupon = await Coupon.findById(id).populate('sellerId');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: 'Coupon not found'
        }
      });
    }

    // Verify status is 'pending_verification'
    if (coupon.status !== 'pending_verification') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Coupon status must be 'pending_verification' to reject. Current status: ${coupon.status}`
        }
      });
    }

    // Update coupon status to 'rejected' and save adminNotes
    coupon.status = 'rejected';
    coupon.adminNotes = reason.trim();
    await coupon.save();

    // Get the User model to access seller
    const User = require('../models/User');
    const seller = await User.findById(coupon.sellerId._id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Seller not found'
        }
      });
    }

    // Check if seller will be banned before incrementing warnings
    const wasBanned = seller.isBanned;

    // Increment seller's warningsCount using incrementWarnings() method
    await seller.incrementWarnings();

    // Create notification for seller about rejection with reason
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: seller._id,
      type: 'rejection',
      title: 'Coupon Rejected',
      message: `Your coupon "${coupon.storeName} - ${coupon.code}" has been rejected. Reason: ${reason.trim()}`,
      relatedId: coupon._id
    });

    // Create ban notification if user was just banned
    if (!wasBanned && seller.isBanned) {
      const { notifyBan } = require('../utils/notificationHelper');
      await notifyBan(seller._id, 'multiple coupon rejections', true);
    }

    // Check if seller was banned after incrementing warnings
    const banMessage = seller.isBanned ? ' The seller has been banned due to multiple violations.' : '';

    res.status(200).json({
      success: true,
      message: `Coupon rejected successfully.${banMessage}`,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        brand: coupon.storeName,
        status: coupon.status,
        adminNotes: coupon.adminNotes,
        seller: {
          name: seller.name,
          email: seller.email,
          warningsCount: seller.warningsCount,
          trustScore: seller.trustScore,
          isBanned: seller.isBanned
        }
      }
    });
  } catch (error) {
    console.error('Reject coupon error:', error);
    next(error);
  }
};

module.exports = {
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
};
