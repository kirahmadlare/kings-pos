/**
 * @fileoverview Authorization Middleware
 *
 * Granular permission checking for RBAC
 */

/**
 * Check if user has specific permission
 * @param {string} resource - Resource name (e.g., 'inventory', 'sales')
 * @param {string} action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns {Function} - Express middleware
 */
export function authorize(resource, action) {
    return (req, res, next) => {
        // User should be attached by authenticate middleware
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check permission using User model method
        if (!req.user.hasPermission(resource, action)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `You do not have permission to ${action} ${resource}`
            });
        }

        next();
    };
}

/**
 * Check if user is admin
 * @returns {Function} - Express middleware
 */
export function requireAdmin() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }

        next();
    };
}

/**
 * Check if user is owner or admin
 * @returns {Function} - Express middleware
 */
export function requireOwnerOrAdmin() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Owner or admin access required'
            });
        }

        next();
    };
}

/**
 * Check multiple permissions (user must have all)
 * @param {Array<{resource: string, action: string}>} permissions
 * @returns {Function} - Express middleware
 */
export function authorizeAll(permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        for (const { resource, action } of permissions) {
            if (!req.user.hasPermission(resource, action)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `You do not have permission to ${action} ${resource}`
                });
            }
        }

        next();
    };
}

/**
 * Check multiple permissions (user must have at least one)
 * @param {Array<{resource: string, action: string}>} permissions
 * @returns {Function} - Express middleware
 */
export function authorizeAny(permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const hasAnyPermission = permissions.some(({ resource, action }) =>
            req.user.hasPermission(resource, action)
        );

        if (!hasAnyPermission) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have the required permissions'
            });
        }

        next();
    };
}

export default {
    authorize,
    requireAdmin,
    requireOwnerOrAdmin,
    authorizeAll,
    authorizeAny
};
