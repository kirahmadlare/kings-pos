/**
 * @fileoverview Audit Logger Middleware
 *
 * Automatically logs all API requests and data changes.
 */

import auditService from '../services/auditService.js';

/**
 * Extract IP address from request
 * @param {Object} req - Express request
 * @returns {String} IP address
 */
function getIpAddress(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip ||
           'unknown';
}

/**
 * Middleware to automatically log requests
 * @param {Object} options - Logging options
 * @returns {Function} Express middleware
 */
export function auditLogger(options = {}) {
    const {
        logResponse = false,
        excludePaths = ['/health', '/api/auth/me']
    } = options;

    return async (req, res, next) => {
        // Skip excluded paths
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Capture original send method
        const originalSend = res.send;
        let responseBody;

        // Override send to capture response
        if (logResponse) {
            res.send = function(data) {
                responseBody = data;
                res.send = originalSend;
                return originalSend.call(this, data);
            };
        }

        // Capture start time
        const startTime = Date.now();

        // On response finish, log the request
        res.on('finish', async () => {
            try {
                // Only log if user is authenticated
                if (!req.userId) return;

                const duration = Date.now() - startTime;
                const metadata = {
                    ipAddress: getIpAddress(req),
                    userAgent: req.headers['user-agent'],
                    duration,
                    success: res.statusCode < 400,
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode
                };

                // Don't log GET requests (read operations)
                if (req.method === 'GET') return;

                // Determine action based on method and path
                const action = determineAction(req.method, req.path);
                const { entityType, entityId } = parseEntityFromPath(req.path, req.body);

                if (action && entityType) {
                    await auditService.logOperation({
                        storeId: req.storeId,
                        userId: req.userId,
                        action,
                        entityType,
                        entityId,
                        before: req.originalData || null, // Set by routes if available
                        after: req.method !== 'DELETE' ? req.body : null,
                        metadata,
                        level: res.statusCode >= 500 ? 'critical' :
                               res.statusCode >= 400 ? 'warning' : 'info'
                    });
                }
            } catch (error) {
                console.error('Audit logging error:', error);
                // Don't throw - audit failures shouldn't break the app
            }
        });

        next();
    };
}

/**
 * Determine action from HTTP method and path
 * @param {String} method - HTTP method
 * @param {String} path - Request path
 * @returns {String} Action type
 */
function determineAction(method, path) {
    if (path.includes('/void')) return 'void';
    if (path.includes('/clock')) return path.includes('in') ? 'clock_in' : 'clock_out';
    if (path.includes('/payment')) return 'payment';
    if (path.includes('/export')) return 'export';
    if (path.includes('/import')) return 'import';
    if (path.includes('/bulk')) {
        if (method === 'POST') return 'bulk_update';
        if (method === 'DELETE') return 'bulk_delete';
    }

    // Standard CRUD
    switch (method) {
        case 'POST': return 'create';
        case 'PUT':
        case 'PATCH': return 'update';
        case 'DELETE': return 'delete';
        default: return null;
    }
}

/**
 * Parse entity type and ID from request path
 * @param {String} path - Request path
 * @param {Object} body - Request body
 * @returns {Object} Entity info
 */
function parseEntityFromPath(path, body) {
    // Extract entity type from path
    const pathParts = path.split('/').filter(Boolean);
    let entityType = null;
    let entityId = null;

    // Path format: /api/{entityType}/{id?}
    if (pathParts.length >= 2) {
        entityType = pathParts[1]; // After 'api'

        // Convert plural to singular
        if (entityType.endsWith('ies')) {
            entityType = entityType.slice(0, -3) + 'y'; // categories -> category
        } else if (entityType.endsWith('s')) {
            entityType = entityType.slice(0, -1); // products -> product
        }

        // Get ID from path or body
        if (pathParts.length >= 3 && !isNaN(pathParts[2])) {
            entityId = pathParts[2];
        } else if (body && body.id) {
            entityId = body.id;
        } else if (body && body._id) {
            entityId = body._id;
        }
    }

    return { entityType, entityId };
}

/**
 * Middleware to log authentication events
 * @param {String} action - Auth action (login, logout, failed_login)
 * @returns {Function} Express middleware
 */
export function logAuthEvent(action) {
    return async (req, res, next) => {
        const originalSend = res.send;

        res.send = function(data) {
            res.send = originalSend;
            const result = originalSend.call(this, data);

            // Log after response sent
            setImmediate(async () => {
                try {
                    const success = res.statusCode < 400;
                    await auditService.logAuthEvent({
                        action,
                        userId: req.userId || null,
                        email: req.body.email,
                        success,
                        ipAddress: getIpAddress(req),
                        userAgent: req.headers['user-agent'],
                        errorMessage: success ? null : (typeof data === 'string' ? data : JSON.parse(data).error)
                    });
                } catch (error) {
                    console.error('Auth audit logging error:', error);
                }
            });

            return result;
        };

        next();
    };
}

/**
 * Middleware to capture original data before update/delete
 * Attach to update/delete routes to log before state
 */
export async function captureOriginalData(model) {
    return async (req, res, next) => {
        try {
            if (req.params.id) {
                const original = await model.findById(req.params.id);
                if (original) {
                    req.originalData = original.toObject();
                }
            }
        } catch (error) {
            console.error('Failed to capture original data:', error);
        }
        next();
    };
}

export default {
    auditLogger,
    logAuthEvent,
    captureOriginalData
};
