/**
 * @fileoverview Rate Limiting Middleware
 *
 * Protect against abuse with configurable rate limits
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP (generous for normal POS usage)
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs (allows ~1 request/sec average)
    message: {
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for certain paths
    skip: (req) => {
        const excludedPaths = [
            '/api/sync/pull',
            '/api/sync/push',
            '/api/auth/me',
            '/api/health',
        ];
        return excludedPaths.some(path => req.path.startsWith(path));
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: {
        error: 'Too many login attempts',
        message: 'Too many login attempts from this IP, please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * OTP request rate limiter
 * 3 OTP requests per hour per IP
 */
export const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 OTP requests per hour
    message: {
        error: 'Too many OTP requests',
        message: 'Too many OTP requests from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Password reset rate limiter
 * 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
        error: 'Too many password reset requests',
        message: 'Too many password reset requests from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * 2FA verification rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const twoFactorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 2FA verification attempts
    message: {
        error: 'Too many verification attempts',
        message: 'Too many 2FA verification attempts from this IP, please try again later.'
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * File upload rate limiter
 * 20 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: {
        error: 'Too many upload requests',
        message: 'Too many file uploads from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Export/report generation rate limiter
 * 10 exports per hour per IP
 */
export const exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 exports per hour
    message: {
        error: 'Too many export requests',
        message: 'Too many export requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests
 * @param {string} options.message - Error message
 * @returns {Function} - Express middleware
 */
export function createRateLimiter(options) {
    const {
        windowMs = 15 * 60 * 1000,
        max = 100,
        message = 'Too many requests, please try again later.'
    } = options;

    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Rate limit exceeded',
            message
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
}

export default {
    apiLimiter,
    authLimiter,
    otpLimiter,
    passwordResetLimiter,
    twoFactorLimiter,
    uploadLimiter,
    exportLimiter,
    createRateLimiter
};
