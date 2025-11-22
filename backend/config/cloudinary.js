const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the file or base64 string
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Cloudinary upload result
 */
const uploadImage = async (filePath, options = {}) => {
    try {
        const defaultOptions = {
            folder: 'coupon-screenshots',
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ],
            ...options
        };

        const result = await cloudinary.uploader.upload(filePath, defaultOptions);

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<object>} - Deletion result
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error(`Image deletion failed: ${error.message}`);
    }
};

module.exports = {
    cloudinary,
    uploadImage,
    deleteImage
};
