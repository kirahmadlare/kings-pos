/**
 * @fileoverview IP Whitelisting Middleware
 *
 * Restrict access to specific IP addresses
 */

import Store from '../models/Store.js';

/**
 * In-memory cache for IP whitelists to avoid database queries on every request
 */
const ipWhitelistCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
function getClientIp(req) {
    // Check for IP in various headers (proxy-aware)
    return (
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip
    );
}

/**
 * Check if IP is in whitelist
 * @param {string} ip - IP address to check
 * @param {Array<string>} whitelist - Array of whitelisted IPs/ranges
 * @returns {boolean} - True if IP is whitelisted
 */
function isIpWhitelisted(ip, whitelist) {
    if (!whitelist || whitelist.length === 0) {
        return true; // No whitelist means all IPs are allowed
    }

    // Normalize IPv6 localhost to IPv4
    const normalizedIp = ip === '::1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '');

    for (const whitelistedIp of whitelist) {
        // Exact match
        if (normalizedIp === whitelistedIp) {
            return true;
        }

        // CIDR range match (e.g., 192.168.1.0/24)
        if (whitelistedIp.includes('/')) {
            if (isIpInCidr(normalizedIp, whitelistedIp)) {
                return true;
            }
        }

        // Wildcard match (e.g., 192.168.1.*)
        if (whitelistedIp.includes('*')) {
            const pattern = whitelistedIp.replace(/\./g, '\\.').replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(normalizedIp)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if IP is in CIDR range
 * @param {string} ip - IP address
 * @param {string} cidr - CIDR notation (e.g., 192.168.1.0/24)
 * @returns {boolean} - True if IP is in range
 */
function isIpInCidr(ip, cidr) {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    const rangeInt = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);

    return (ipInt & mask) === (rangeInt & mask);
}

/**
 * Load IP whitelist from database with caching
 * @param {string} storeId - Store ID
 * @returns {Promise<Array<string>>} - Array of whitelisted IPs
 */
async function loadIpWhitelist(storeId) {
    // Check cache first
    const cached = ipWhitelistCache.get(storeId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.whitelist;
    }

    try {
        const store = await Store.findById(storeId).select('ipWhitelist');
        const whitelist = store?.ipWhitelist || [];

        // Update cache
        ipWhitelistCache.set(storeId, {
            whitelist,
            timestamp: Date.now()
        });

        return whitelist;
    } catch (error) {
        console.error('Error loading IP whitelist:', error);
        return [];
    }
}

/**
 * Clear IP whitelist cache for a store
 * @param {string} storeId - Store ID
 */
export function clearIpWhitelistCache(storeId) {
    if (storeId) {
        ipWhitelistCache.delete(storeId);
    } else {
        ipWhitelistCache.clear();
    }
}

/**
 * IP whitelist middleware for admin routes
 * Checks global admin IP whitelist
 * @returns {Function} - Express middleware
 */
export function requireWhitelistedIp() {
    return async (req, res, next) => {
        const clientIp = getClientIp(req);

        // Get admin whitelist from environment or configuration
        const adminWhitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

        // If no whitelist is configured, allow all
        if (adminWhitelist.length === 0) {
            return next();
        }

        if (isIpWhitelisted(clientIp, adminWhitelist)) {
            return next();
        }

        console.warn(`Blocked access from non-whitelisted IP: ${clientIp}`);
        res.status(403).json({
            error: 'Forbidden',
            message: 'Access from your IP address is not allowed'
        });
    };
}

/**
 * IP whitelist middleware for store-specific routes
 * Checks store's IP whitelist
 * @returns {Function} - Express middleware
 */
export function requireStoreWhitelistedIp() {
    return async (req, res, next) => {
        const clientIp = getClientIp(req);

        // Get storeId from user or request
        const storeId = req.user?.storeId || req.user?.currentStoreId || req.body?.storeId;

        if (!storeId) {
            // No store context, skip IP check
            return next();
        }

        // Load store's IP whitelist
        const whitelist = await loadIpWhitelist(storeId);

        // If no whitelist is configured for this store, allow all
        if (whitelist.length === 0) {
            return next();
        }

        if (isIpWhitelisted(clientIp, whitelist)) {
            return next();
        }

        console.warn(`Blocked access from non-whitelisted IP: ${clientIp} for store: ${storeId}`);
        res.status(403).json({
            error: 'Forbidden',
            message: 'Access from your IP address is not allowed for this store'
        });
    };
}

/**
 * Custom IP whitelist middleware
 * @param {Array<string>} whitelist - Array of whitelisted IPs
 * @returns {Function} - Express middleware
 */
export function checkIpWhitelist(whitelist) {
    return (req, res, next) => {
        const clientIp = getClientIp(req);

        if (isIpWhitelisted(clientIp, whitelist)) {
            return next();
        }

        console.warn(`Blocked access from non-whitelisted IP: ${clientIp}`);
        res.status(403).json({
            error: 'Forbidden',
            message: 'Access from your IP address is not allowed'
        });
    };
}

export default {
    requireWhitelistedIp,
    requireStoreWhitelistedIp,
    checkIpWhitelist,
    clearIpWhitelistCache,
    getClientIp
};
