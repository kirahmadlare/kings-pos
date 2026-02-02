/**
 * @fileoverview Conflict Resolution Routes
 *
 * API endpoints for resolving data conflicts
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { Product, Sale, Customer, Employee, Credit, Category } from '../models/index.js';
import { resolveConflict } from '../services/conflictResolver.js';

const router = express.Router();

router.use(authenticate);

// Map entity types to models
const modelMap = {
    product: Product,
    sale: Sale,
    customer: Customer,
    employee: Employee,
    credit: Credit,
    category: Category
};

/**
 * POST /api/conflicts/resolve
 * Resolve a conflict with explicit strategy
 */
router.post('/resolve', async (req, res) => {
    try {
        const { entityType, entityId, strategy, clientData } = req.body;

        if (!entityType || !entityId || !strategy) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const Model = modelMap[entityType];
        if (!Model) {
            return res.status(400).json({ error: 'Invalid entity type' });
        }

        // Get current server version
        const serverDoc = await Model.findOne({
            _id: entityId,
            storeId: req.storeId
        });

        if (!serverDoc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Apply resolution strategy
        const resolvedData = resolveConflict(strategy, serverDoc, clientData);

        // Update the document
        const updated = await Model.findOneAndUpdate(
            { _id: entityId, storeId: req.storeId },
            resolvedData,
            { new: true }
        );

        res.json({
            success: true,
            strategy,
            data: updated
        });
    } catch (error) {
        console.error('Resolve conflict error:', error);
        res.status(500).json({ error: 'Failed to resolve conflict' });
    }
});

/**
 * GET /api/conflicts/:entityType/:entityId
 * Get current state of a potentially conflicted entity
 */
router.get('/:entityType/:entityId', async (req, res) => {
    try {
        const { entityType, entityId } = req.params;

        const Model = modelMap[entityType];
        if (!Model) {
            return res.status(400).json({ error: 'Invalid entity type' });
        }

        const doc = await Model.findOne({
            _id: entityId,
            storeId: req.storeId
        });

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({
            data: doc,
            syncVersion: doc.syncVersion,
            lastSyncedAt: doc.lastSyncedAt,
            updatedAt: doc.updatedAt
        });
    } catch (error) {
        console.error('Get conflict state error:', error);
        res.status(500).json({ error: 'Failed to get document state' });
    }
});

export default router;
