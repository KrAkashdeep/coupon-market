/**
 * Middleware to validate coupon code format
 * Ensures code is alphanumeric
 */
const validateCouponCode = (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Coupon code is required'
                }
            });
        }

        // Validate code is alphanumeric
        const alphanumericRegex = /^[a-zA-Z0-9]+$/;
        if (!alphanumericRegex.test(code.trim())) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Coupon code must contain only alphanumeric characters'
                }
            });
        }

        next();
    } catch (error) {
        console.error('Code validation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Error validating coupon code'
            }
        });
    }
};

module.exports = {
    validateCouponCode
};
