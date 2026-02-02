/**
 * @fileoverview Cache Service
 *
 * Provides caching functionality with Redis
 * Gracefully falls back to no caching if Redis is unavailable
 */

import { getRedisClient, isRedisConnected } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Default TTL values (in seconds)
 */
export const TTL = {
    PRODUCTS: 300,      // 5 minutes
    CUSTOMERS: 180,     // 3 minutes
    EMPLOYEES: 300,     // 5 minutes
    SALES: 60,          // 1 minute
    CATEGORIES: 600,    // 10 minutes
    REPORTS: 600,       // 10 minutes
    SETTINGS: 900,      // 15 minutes
    SHORT: 30,          // 30 seconds
    MEDIUM: 300,        // 5 minutes
    LONG: 3600          // 1 hour
};

/**
 * Generate cache key with namespace
 */
export function generateCacheKey(namespace, ...parts) {
    return `pos:${namespace}:${parts.join(':')}`;
}

/**
 * Get value from cache
 *
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
export async function getCache(key) {
    if (!isRedisConnected()) {
        return null;
    }

    try {
        const redis = getRedisClient();
        const value = await redis.get(key);

        if (value) {
            logger.debug(`Cache HIT: ${key}`);
            return JSON.parse(value);
        }

        logger.debug(`Cache MISS: ${key}`);
        return null;
    } catch (error) {
        logger.warn(`Cache GET error for ${key}:`, error.message);
        return null;
    }
}

/**
 * Set value in cache
 *
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
export async function setCache(key, value, ttl = TTL.MEDIUM) {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const redis = getRedisClient();
        await redis.setex(key, ttl, JSON.stringify(value));
        logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
        return true;
    } catch (error) {
        logger.warn(`Cache SET error for ${key}:`, error.message);
        return false;
    }
}

/**
 * Delete specific key from cache
 *
 * @param {string} key - Cache key
 */
export async function deleteCache(key) {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const redis = getRedisClient();
        await redis.del(key);
        logger.debug(`Cache DELETE: ${key}`);
        return true;
    } catch (error) {
        logger.warn(`Cache DELETE error for ${key}:`, error.message);
        return false;
    }
}

/**
 * Delete all keys matching pattern
 *
 * @param {string} pattern - Key pattern (e.g., "pos:products:*")
 */
export async function deleteCachePattern(pattern) {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);

        if (keys.length > 0) {
            await redis.del(...keys);
            logger.debug(`Cache DELETE PATTERN: ${pattern} (${keys.length} keys)`);
        }

        return true;
    } catch (error) {
        logger.warn(`Cache DELETE PATTERN error for ${pattern}:`, error.message);
        return false;
    }
}

/**
 * Clear all cache for a specific store
 *
 * @param {string} storeId - Store ID
 */
export async function clearStoreCache(storeId) {
    return await deleteCachePattern(`pos:*:${storeId}:*`);
}

/**
 * Clear all cache for a specific entity type
 *
 * @param {string} entityType - Entity type (products, customers, etc.)
 * @param {string} storeId - Store ID
 */
export async function clearEntityCache(entityType, storeId) {
    return await deleteCachePattern(`pos:${entityType}:${storeId}:*`);
}

/**
 * Wrap a function with caching
 * Useful for caching database queries
 *
 * @param {string} key - Cache key
 * @param {Function} fn - Function to execute if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fresh data
 */
export async function withCache(key, fn, ttl = TTL.MEDIUM) {
    // Try to get from cache
    const cached = await getCache(key);
    if (cached !== null) {
        return cached;
    }

    // Cache miss - execute function
    const result = await fn();

    // Store in cache
    await setCache(key, result, ttl);

    return result;
}

/**
 * Invalidate cache for entity changes
 * Deletes all related cache keys
 *
 * @param {string} entityType - Entity type
 * @param {string} storeId - Store ID
 * @param {string} entityId - Entity ID (optional)
 */
export async function invalidateEntityCache(entityType, storeId, entityId = null) {
    const patterns = [
        // List cache
        `pos:${entityType}:${storeId}:list:*`,
        // Count cache
        `pos:${entityType}:${storeId}:count`,
        // Stats cache
        `pos:${entityType}:${storeId}:stats`
    ];

    // Specific entity cache
    if (entityId) {
        patterns.push(`pos:${entityType}:${storeId}:${entityId}`);
    }

    // Delete all patterns
    await Promise.all(patterns.map(pattern => deleteCachePattern(pattern)));

    logger.debug(`Invalidated cache for ${entityType}${entityId ? `:${entityId}` : ''}`);
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
    if (!isRedisConnected()) {
        return { available: false };
    }

    try {
        const redis = getRedisClient();
        const info = await redis.info('stats');
        const dbSize = await redis.dbsize();

        // Parse stats from info string
        const stats = {};
        info.split('\r\n').forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) {
                stats[key] = value;
            }
        });

        return {
            available: true,
            connected: isRedisConnected(),
            keysCount: dbSize,
            hits: parseInt(stats.keyspace_hits || 0),
            misses: parseInt(stats.keyspace_misses || 0),
            hitRate: stats.keyspace_hits && stats.keyspace_misses
                ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2)
                : 0
        };
    } catch (error) {
        logger.warn('Error getting cache stats:', error.message);
        return { available: false, error: error.message };
    }
}

export default {
    TTL,
    generateCacheKey,
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
    clearStoreCache,
    clearEntityCache,
    withCache,
    invalidateEntityCache,
    getCacheStats
};
