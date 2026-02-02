/**
 * @fileoverview Custom Error Classes
 *
 * Defines custom error types for better error handling and HTTP status mapping
 */

/**
 * Base API Error class
 */
export class APIError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = true; // Operational errors are expected and handled
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error - 400 Bad Request
 * Used when request data fails validation
 */
export class ValidationError extends APIError {
    constructor(message = 'Validation failed', errors = []) {
        super(message, 400);
        this.errors = errors;
    }
}

/**
 * Authentication Error - 401 Unauthorized
 * Used when authentication is required but missing or invalid
 */
export class AuthenticationError extends APIError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

/**
 * Authorization Error - 403 Forbidden
 * Used when user doesn't have permission for the action
 */
export class AuthorizationError extends APIError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403);
    }
}

/**
 * Not Found Error - 404 Not Found
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends APIError {
    constructor(message = 'Resource not found', resource = null) {
        super(message, 404);
        this.resource = resource;
    }
}

/**
 * Conflict Error - 409 Conflict
 * Used when there's a data conflict (e.g., concurrent edits)
 */
export class ConflictError extends APIError {
    constructor(message = 'Data conflict detected', conflictData = null) {
        super(message, 409);
        this.conflictData = conflictData;
    }
}

/**
 * Rate Limit Error - 429 Too Many Requests
 * Used when rate limit is exceeded
 */
export class RateLimitError extends APIError {
    constructor(message = 'Too many requests', retryAfter = 60) {
        super(message, 429);
        this.retryAfter = retryAfter;
    }
}

/**
 * Database Error - 500 Internal Server Error
 * Used when database operations fail
 */
export class DatabaseError extends APIError {
    constructor(message = 'Database operation failed', originalError = null) {
        super(message, 500);
        this.originalError = originalError;
        this.isOperational = false; // Database errors are not operational
    }
}

/**
 * External Service Error - 502 Bad Gateway
 * Used when external service call fails
 */
export class ExternalServiceError extends APIError {
    constructor(message = 'External service unavailable', service = null) {
        super(message, 502);
        this.service = service;
    }
}

/**
 * Check if error is operational (expected and handled)
 */
export function isOperationalError(error) {
    if (error instanceof APIError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Map Mongoose validation errors to ValidationError
 */
export function handleMongooseError(error) {
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
        }));
        return new ValidationError('Validation failed', errors);
    }

    if (error.name === 'CastError') {
        return new ValidationError(`Invalid ${error.path}: ${error.value}`);
    }

    if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        return new ValidationError(`${field} already exists`);
    }

    return new DatabaseError('Database error', error);
}

export default {
    APIError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    isOperationalError,
    handleMongooseError
};
