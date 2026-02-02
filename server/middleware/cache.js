/**
 * @fileoverview Cache Middleware
 *
 * Middleware for caching GET requests
 */

import { generateCacheKey, getCache, setCache, TTL } from '../services/cacheService.js';
import logger from '../utils/logger.js';

/**
 * Cache middleware factory
 * Creates middleware that caches GET responses
 *
 * @param {Object} options - Cache options
 * @param {string} options.namespace - Cache namespace (e.g., 'products', 'customers')
 * @param {number} options.ttl - Time to live in seconds
 * @param {Function} options.keyGenerator - Optional custom key generator function
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(options = {}) {
    const {
        namespace = 'default',
        ttl = TTL.MEDIUM,
        keyGenerator = null
    } = options;

    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        try {
            // Generate cache key
            let cacheKey;
            if (keyGenerator) {
                cacheKey = keyGenerator(req);
            } else {
                // Default: namespace:storeId:path:query
                const queryString = JSON.stringify(req.query);
                cacheKey = generateCacheKey(
                    namespace,
                    req.storeId || 'global',
                    req.path,
                    queryString
                );
            }

            // Try to get from cache
            const cached = await getCache(cacheKey);

            if (cached !== null) {
                logger.debug(`Serving from cache: ${cacheKey}`);
                return res.json(cached);
            }

            // Cache miss - intercept response
            const originalJson = res.json.bind(res);

            res.json = (data) => {
                // Store successful responses in cache
                if (res.statusCode === 200) {
                    setCache(cacheKey, data, ttl).catch(err => {
                        logger.warn('Failed to cache response:', err.message);
                    });
                }

                // Send response
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.warn('Cache middleware error:', error.message);
            next();
        }
    };
}

/**
 * Cache middleware for product lists
 */
export const cacheProducts = cacheMiddleware({
    namespace: 'products',
    ttl: TTL.PRODUCTS
});

/**
 * Cache middleware for customer lists
 */
export const cacheCustomers = cacheMiddleware({
    namespace: 'customers',
    ttl: TTL.CUSTOMERS
});

/**
 * Cache middleware for employee lists
 */
export const cacheEmployees = cacheMiddleware({
    namespace: 'employees',
    ttl: TTL.EMPLOYEES
});

/**
 * Cache middleware for sales
 */
export const cacheSales = cacheMiddleware({
    namespace: 'sales',
    ttl: TTL.SALES
});

/**
 * Cache middleware for categories
 */
export const cacheCategories = cacheMiddleware({
    namespace: 'categories',
    ttl: TTL.CATEGORIES
});

/**
 * Cache middleware for reports
 */
export const cacheReports = cacheMiddleware({
    namespace: 'reports',
    ttl: TTL.REPORTS
});

/**
 * Cache middleware for settings
 */
export const cacheSettings = cacheMiddleware({
    namespace: 'settings',
    ttl: TTL.SETTINGS
});

// Re-export TTL for convenience
export { TTL };

export default {
    cacheMiddleware,
    cacheProducts,
    cacheCustomers,
    cacheEmployees,
    cacheSales,
    cacheCategories,
    cacheReports,
    cacheSettings,
    TTL
};
