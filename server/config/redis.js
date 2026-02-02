/**
 * @fileoverview Redis Configuration
 *
 * Sets up Redis connection for caching
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;
let isRedisAvailable = false;

/**
 * Create Redis client with configuration
 */
const createRedisClient = () => {
    const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryStrategy: (times) => {
            // Stop retrying after 3 attempts
            if (times > 3) {
                return null;
            }
            const delay = Math.min(times * 1000, 3000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
    };

    const client = new Redis(config);

    // Connection events
    client.on('connect', () => {
        logger.info('Redis connecting...');
    });

    client.on('ready', () => {
        isRedisAvailable = true;
        logger.info('✅ Redis connected successfully');
    });

    client.on('error', (error) => {
        isRedisAvailable = false;
        logger.warn('Redis connection error (working without cache):', error.message);
    });

    client.on('close', () => {
        isRedisAvailable = false;
        logger.warn('Redis connection closed');
    });

    client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
    });

    return client;
};

/**
 * Connect to Redis
 */
export const connectRedis = async () => {
    try {
        if (!redisClient) {
            redisClient = createRedisClient();
        }

        await redisClient.connect();
        logger.info('Redis connection established');
        return redisClient;
    } catch (error) {
        isRedisAvailable = false;
        logger.warn('Failed to connect to Redis (continuing without cache):', error.message);
        return null;
    }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = () => {
    return redisClient;
};

/**
 * Check if Redis is available
 */
export const isRedisConnected = () => {
    return isRedisAvailable && redisClient && redisClient.status === 'ready';
};

/**
 * Close Redis connection
 */
export const disconnectRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis disconnected');
    }
};

/**
 * Graceful shutdown handler
 */
export const setupRedisShutdown = () => {
    process.on('SIGINT', async () => {
        await disconnectRedis();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await disconnectRedis();
        process.exit(0);
    });
};

export default {
    connectRedis,
    getRedisClient,
    isRedisConnected,
    disconnectRedis,
    setupRedisShutdown
};
