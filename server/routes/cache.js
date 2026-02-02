/**
 * @fileoverview Cache Management Routes
 *
 * API endpoints for cache statistics and management
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCacheStats, clearStoreCache, clearEntityCache } from '../services/cacheService.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getCacheStats();
        res.json(stats);
    } catch (error) {
        console.error('Get cache stats error:', error);
        res.status(500).json({ error: 'Failed to get cache stats' });
    }
});

/**
 * DELETE /api/cache/store
 * Clear all cache for current store
 */
router.delete('/store', async (req, res) => {
    try {
        await clearStoreCache(req.storeId);
        res.json({ message: 'Store cache cleared successfully' });
    } catch (error) {
        console.error('Clear store cache error:', error);
        res.status(500).json({ error: 'Failed to clear store cache' });
    }
});

/**
 * DELETE /api/cache/:entityType
 * Clear cache for specific entity type
 */
router.delete('/:entityType', async (req, res) => {
    try {
        const { entityType } = req.params;
        await clearEntityCache(entityType, req.storeId);
        res.json({ message: `${entityType} cache cleared successfully` });
    } catch (error) {
        console.error('Clear entity cache error:', error);
        res.status(500).json({ error: 'Failed to clear entity cache' });
    }
});

export default router;
