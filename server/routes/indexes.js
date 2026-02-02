/**
 * @fileoverview Database Index Monitoring Routes
 *
 * API endpoints for monitoring database indexes and their usage
 */

import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/indexes/stats
 * Get index usage statistics for all collections
 */
router.get('/stats', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        const indexStats = await Promise.all(
            collections.map(async (collection) => {
                const collectionName = collection.name;

                // Get indexes for this collection
                const indexes = await db.collection(collectionName).indexes();

                // Get index stats (usage statistics)
                let stats = [];
                try {
                    stats = await db.collection(collectionName)
                        .aggregate([{ $indexStats: {} }])
                        .toArray();
                } catch (error) {
                    // $indexStats may not be available in all MongoDB versions
                    stats = [];
                }

                return {
                    collection: collectionName,
                    indexCount: indexes.length,
                    indexes: indexes.map(idx => ({
                        name: idx.name,
                        keys: idx.key,
                        unique: idx.unique || false,
                        sparse: idx.sparse || false,
                        background: idx.background || false
                    })),
                    usage: stats.map(stat => ({
                        name: stat.name,
                        usageCount: stat.accesses?.ops || 0,
                        since: stat.accesses?.since || null
                    }))
                };
            })
        );

        res.json({
            totalCollections: collections.length,
            collections: indexStats
        });
    } catch (error) {
        console.error('Get index stats error:', error);
        res.status(500).json({ error: 'Failed to get index statistics' });
    }
});

/**
 * GET /api/indexes/:collection
 * Get indexes for a specific collection
 */
router.get('/:collection', async (req, res) => {
    try {
        const { collection } = req.params;
        const db = mongoose.connection.db;

        // Check if collection exists
        const collections = await db.listCollections({ name: collection }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        // Get indexes
        const indexes = await db.collection(collection).indexes();

        // Get index stats
        let stats = [];
        try {
            stats = await db.collection(collection)
                .aggregate([{ $indexStats: {} }])
                .toArray();
        } catch (error) {
            stats = [];
        }

        res.json({
            collection,
            indexes: indexes.map(idx => {
                const usage = stats.find(s => s.name === idx.name);
                return {
                    name: idx.name,
                    keys: idx.key,
                    unique: idx.unique || false,
                    sparse: idx.sparse || false,
                    background: idx.background || false,
                    size: idx.size,
                    usageCount: usage?.accesses?.ops || 0,
                    since: usage?.accesses?.since || null
                };
            })
        });
    } catch (error) {
        console.error('Get collection indexes error:', error);
        res.status(500).json({ error: 'Failed to get collection indexes' });
    }
});

/**
 * POST /api/indexes/rebuild/:collection
 * Rebuild indexes for a specific collection
 * (Use with caution - can impact performance)
 */
router.post('/rebuild/:collection', async (req, res) => {
    try {
        const { collection } = req.params;
        const db = mongoose.connection.db;

        // Check if collection exists
        const collections = await db.listCollections({ name: collection }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        // Rebuild indexes
        await db.collection(collection).reIndex();

        res.json({
            message: `Indexes rebuilt successfully for collection: ${collection}`,
            collection
        });
    } catch (error) {
        console.error('Rebuild indexes error:', error);
        res.status(500).json({ error: 'Failed to rebuild indexes' });
    }
});

/**
 * GET /api/indexes/slow-queries
 * Get slow query analysis (requires profiling to be enabled)
 */
router.get('/slow-queries/analysis', async (req, res) => {
    try {
        const db = mongoose.connection.db;

        // Check profiling status
        const profilingStatus = await db.command({ profile: -1 });

        if (profilingStatus.was === 0) {
            return res.json({
                message: 'Database profiling is disabled. Enable it to track slow queries.',
                profilingLevel: 0,
                slowQueries: []
            });
        }

        // Get slow queries from system.profile
        const slowQueries = await db.collection('system.profile')
            .find({ millis: { $gt: 100 } })
            .sort({ ts: -1 })
            .limit(50)
            .toArray();

        res.json({
            profilingLevel: profilingStatus.was,
            slowThreshold: profilingStatus.slowms,
            slowQueries: slowQueries.map(q => ({
                timestamp: q.ts,
                operation: q.op,
                namespace: q.ns,
                duration: q.millis,
                query: q.command || q.query,
                planSummary: q.planSummary
            }))
        });
    } catch (error) {
        console.error('Get slow queries error:', error);
        res.status(500).json({ error: 'Failed to get slow queries' });
    }
});

export default router;
