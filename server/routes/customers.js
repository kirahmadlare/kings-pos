/**
 * @fileoverview Customer Routes
 */

import express from 'express';
import { Customer, Credit, Sale } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { cacheCustomers } from '../middleware/cache.js';
import { invalidateEntityCache } from '../services/cacheService.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /customers
 */
router.get('/', cacheCustomers, async (req, res) => {
    try {
        const { search } = req.query;

        const query = { storeId: req.storeId };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const customers = await Customer.find(query).sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to get customers' });
    }
});

/**
 * GET /customers/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const customer = await Customer.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(customer);
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
});

/**
 * GET /customers/:id/orders
 */
router.get('/:id/orders', async (req, res) => {
    try {
        const orders = await Sale.find({
            storeId: req.storeId,
            customerId: req.params.id
        }).sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

/**
 * GET /customers/:id/credits
 */
router.get('/:id/credits', async (req, res) => {
    try {
        const credits = await Credit.find({
            storeId: req.storeId,
            customerId: req.params.id
        }).sort({ dueDate: 1 });

        res.json(credits);
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({ error: 'Failed to get credits' });
    }
});

/**
 * POST /customers
 */
router.post('/', async (req, res) => {
    try {
        const customer = new Customer({
            ...req.body,
            storeId: req.storeId
        });

        await customer.save();

        // Invalidate customer cache
        await invalidateEntityCache('customers', req.storeId);

        res.status(201).json(customer);
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

/**
 * PUT /customers/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const customer = await Customer.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            { ...req.body },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Invalidate customer cache
        await invalidateEntityCache('customers', req.storeId, req.params.id);

        res.json(customer);
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

/**
 * DELETE /customers/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const customer = await Customer.findOneAndDelete({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Invalidate customer cache
        await invalidateEntityCache('customers', req.storeId, req.params.id);

        res.json({ message: 'Customer deleted' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

export default router;
