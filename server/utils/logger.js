/**
 * @fileoverview Winston Logger Configuration
 *
 * Centralized logging with Winston for better error tracking and debugging
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format (for development)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// Define which transports the logger must use
const transports = [
    // Console transport for all environments
    new winston.transports.Console({
        format: consoleFormat
    })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logsDir = path.join(__dirname, '../logs');

    transports.push(
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format
        })
    );
}

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    levels,
    format,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false
});

/**
 * Log HTTP request
 */
export function logRequest(req, res, responseTime) {
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
    logger.error(error.message, {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            statusCode: error.statusCode
        },
        ...context
    });
}

/**
 * Log warning with context
 */
export function logWarning(message, context = {}) {
    logger.warn(message, context);
}

/**
 * Log info with context
 */
export function logInfo(message, context = {}) {
    logger.info(message, context);
}

/**
 * Log debug with context
 */
export function logDebug(message, context = {}) {
    logger.debug(message, context);
}

// Export the logger instance
export default logger;
