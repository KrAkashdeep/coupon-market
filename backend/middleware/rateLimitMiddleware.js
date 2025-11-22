const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for webhook endpoints
 * Allows 100 requests per 15 minutes per IP
 */
const webhookRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later'
        }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for successful requests
    skipSuccessfulRequests: false,
    // Skip rate limiting for failed requests
    skipFailedRequests: false
});

module.exports = {
    webhookRateLimiter
};
