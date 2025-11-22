const multer = require('multer');
const { uploadImage } = require('../config/cloudinary');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to validate image types
const fileFilter = (req, file, cb) => {
    // Allowed mime types
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
};

// Configure multer with size limit and file filter
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB in bytes
    },
    fileFilter: fileFilter
});

/**
 * Middleware to validate uploaded image
 * Checks file type and size
 */
const validateImage = (req, res, next) => {
    // Use multer's single file upload
    const uploadSingle = upload.single('screenshot');

    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_IMAGE',
                        message: 'File size exceeds 5MB limit'
                    }
                });
            }
            return res.status(400).json({
                success: false,
                error: {
                    code: 'UPLOAD_FAILED',
                    message: err.message
                }
            });
        } else if (err) {
            // Custom errors (like file type validation)
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_IMAGE',
                    message: err.message
                }
            });
        }

        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Screenshot file is required'
                }
            });
        }

        next();
    });
};

/**
 * Middleware to upload validated image to Cloudinary
 * Converts buffer to base64 and uploads
 */
const uploadToCloudinary = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'No file to upload'
                }
            });
        }

        // Convert buffer to base64 data URI
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await uploadImage(dataURI, {
            folder: 'coupon-screenshots',
            resource_type: 'image'
        });

        if (!result.success) {
            throw new Error('Upload to Cloudinary failed');
        }

        // Attach Cloudinary result to request
        req.cloudinaryResult = {
            url: result.url,
            publicId: result.publicId,
            format: result.format,
            size: result.bytes
        };

        next();
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'UPLOAD_FAILED',
                message: 'Failed to upload image to cloud storage',
                details: error.message
            }
        });
    }
};

module.exports = {
    validateImage,
    uploadToCloudinary
};
