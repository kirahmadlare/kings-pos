/**
 * @fileoverview Sync Routes
 * 
 * Handles data synchronization between frontend (IndexedDB) and backend (MongoDB)
 */

import express from 'express';
import {
    Product, Category, Sale, Customer, Credit,
    Employee, Shift, ClockEvent
} from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * POST /sync/push
 * Push local changes to server
 */
router.post('/push', async (req, res) => {
    try {
        const { changes } = req.body;
        const results = [];

        for (const change of changes) {
            const { table, action, localId, data } = change;

            try {
                let result;
                const Model = getModel(table);

                if (!Model) {
                    results.push({ localId, error: 'Unknown table' });
                    continue;
                }

                switch (action) {
                    case 'create':
                        const doc = new Model({
                            ...data,
                            storeId: req.storeId,
                            _localId: localId
                        });
                        result = await doc.save();
                        results.push({
                            localId,
                            serverId: result._id,
                            success: true
                        });
                        break;

                    case 'update':
                        result = await Model.findOneAndUpdate(
                            { _id: data._id, storeId: req.storeId },
                            data,
                            { new: true }
                        );
                        results.push({
                            localId,
                            success: !!result
                        });
                        break;

                    case 'delete':
                        result = await Model.findOneAndDelete({
                            _id: data._id,
                            storeId: req.storeId
                        });
                        results.push({
                            localId,
                            success: !!result
                        });
                        break;

                    default:
                        results.push({ localId, error: 'Unknown action' });
                }
            } catch (err) {
                console.error('Sync push error:', err);
                results.push({ localId, error: err.message });
            }
        }

        res.json({ results });
    } catch (error) {
        console.error('Sync push error:', error);
        res.status(500).json({ error: 'Sync push failed' });
    }
});

/**
 * GET /sync/pull
 * Pull all data from server
 */
router.get('/pull', async (req, res) => {
    try {
        const { since } = req.query;
        const query = { storeId: req.storeId };

        // If since provided, only get updated records
        if (since) {
            query.updatedAt = { $gt: new Date(since) };
        }

        const [
            products, categories, sales, customers,
            credits, employees, shifts, clockEvents
        ] = await Promise.all([
            Product.find(query),
            Category.find(query),
            Sale.find(query).limit(1000), // Limit sales for performance
            Customer.find(query),
            Credit.find(query),
            Employee.find(query),
            Shift.find(query),
            ClockEvent.find(query)
        ]);

        res.json({
            products,
            categories,
            sales,
            customers,
            credits,
            employees,
            shifts,
            clockEvents,
            syncedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sync pull error:', error);
        res.status(500).json({ error: 'Sync pull failed' });
    }
});

/**
 * Get Mongoose model by table name
 */
function getModel(tableName) {
    const models = {
        products: Product,
        categories: Category,
        sales: Sale,
        customers: Customer,
        credits: Credit,
        employees: Employee,
        shifts: Shift,
        clockEvents: ClockEvent
    };
    return models[tableName];
}

export default router;
