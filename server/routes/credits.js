/**
 * @fileoverview Credit Routes
 */

import express from 'express';
import { Credit, Customer } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /credits
 * Get all credits with filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, customerId, due } = req.query;

        const query = { storeId: req.storeId };

        if (status) query.status = status;
        if (customerId) query.customerId = customerId;

        // Filter by due soon
        if (due === 'week') {
            const weekFromNow = new Date();
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            query.dueDate = { $lte: weekFromNow };
            query.status = { $ne: 'paid' };
        }

        const credits = await Credit.find(query)
            .populate('customerId', 'name phone')
            .sort({ dueDate: 1 });

        res.json(credits);
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({ error: 'Failed to get credits' });
    }
});

/**
 * GET /credits/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const credit = await Credit.findOne({
            _id: req.params.id,
            storeId: req.storeId
        }).populate('customerId', 'name phone');

        if (!credit) {
            return res.status(404).json({ error: 'Credit not found' });
        }

        res.json(credit);
    } catch (error) {
        console.error('Get credit error:', error);
        res.status(500).json({ error: 'Failed to get credit' });
    }
});

/**
 * POST /credits/:id/payment
 * Record a payment against a credit
 */
router.post('/:id/payment', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount' });
        }

        const credit = await Credit.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!credit) {
            return res.status(404).json({ error: 'Credit not found' });
        }

        const remaining = credit.amount - credit.amountPaid;
        const paymentAmount = Math.min(amount, remaining);

        credit.amountPaid += paymentAmount;

        if (credit.amountPaid >= credit.amount) {
            credit.status = 'paid';
            credit.paidAt = new Date();
        } else {
            credit.status = 'partial';
        }

        await credit.save();

        res.json({
            message: 'Payment recorded',
            credit,
            paymentAmount,
            remainingBalance: credit.amount - credit.amountPaid
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

/**
 * PUT /credits/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const credit = await Credit.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            { ...req.body },
            { new: true }
        );

        if (!credit) {
            return res.status(404).json({ error: 'Credit not found' });
        }

        res.json(credit);
    } catch (error) {
        console.error('Update credit error:', error);
        res.status(500).json({ error: 'Failed to update credit' });
    }
});

export default router;
