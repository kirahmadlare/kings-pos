/**
 * @fileoverview Centralized Error Handler Middleware
 *
 * Catches all errors and sends appropriate responses
 */

import { APIError, isOperationalError, handleMongooseError } from '../utils/errors.js';
import { logError } from '../utils/logger.js';

/**
 * Error handler middleware
 * Must be the last middleware in the chain
 */
export function errorHandler(err, req, res, next) {
    let error = err;

    // Convert Mongoose errors to APIError
    if (err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000) {
        error = handleMongooseError(err);
    }

    // Convert non-APIError to APIError
    if (!(error instanceof APIError)) {
        error = new APIError(
            error.message || 'Internal server error',
            error.statusCode || 500
        );
    }

    // Log the error
    logError(error, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.userId,
        storeId: req.storeId
    });

    // Prepare error response
    const response = {
        error: error.message,
        statusCode: error.statusCode
    };

    // Add additional error details in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
        response.name = error.name;
    }

    // Add error-specific data
    if (error.errors) {
        response.errors = error.errors; // Validation errors
    }

    if (error.conflictData) {
        response.conflict = error.conflictData; // Conflict data
    }

    if (error.retryAfter) {
        response.retryAfter = error.retryAfter; // Rate limit info
        res.set('Retry-After', error.retryAfter);
    }

    // Send error response
    res.status(error.statusCode).json(response);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
}

/**
 * Unhandled rejection handler
 */
export function handleUnhandledRejection() {
    process.on('unhandledRejection', (reason, promise) => {
        logError(new Error('Unhandled Promise Rejection'), {
            reason: reason,
            promise: promise
        });

        // In production, exit gracefully
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    });
}

/**
 * Uncaught exception handler
 */
export function handleUncaughtException() {
    process.on('uncaughtException', (error) => {
        logError(error, { type: 'Uncaught Exception' });

        // Exit process - uncaught exceptions are fatal
        process.exit(1);
    });
}

export default {
    errorHandler,
    asyncHandler,
    notFoundHandler,
    handleUnhandledRejection,
    handleUncaughtException
};
