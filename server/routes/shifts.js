/**
 * @fileoverview Shift Routes
 */

import express from 'express';
import { Shift } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /shifts
 * Get shifts for a date range
 */
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, employeeId } = req.query;

        const query = { storeId: req.storeId };

        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        if (employeeId) {
            query.employeeId = employeeId;
        }

        const shifts = await Shift.find(query)
            .populate('employeeId', 'name role')
            .sort({ date: 1, startTime: 1 });

        res.json(shifts);
    } catch (error) {
        console.error('Get shifts error:', error);
        res.status(500).json({ error: 'Failed to get shifts' });
    }
});

/**
 * GET /shifts/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const shift = await Shift.findOne({
            _id: req.params.id,
            storeId: req.storeId
        }).populate('employeeId', 'name role');

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json(shift);
    } catch (error) {
        console.error('Get shift error:', error);
        res.status(500).json({ error: 'Failed to get shift' });
    }
});

/**
 * POST /shifts
 */
router.post('/', async (req, res) => {
    try {
        // Validate employeeId - should be ObjectId, not number
        if (req.body.employeeId && typeof req.body.employeeId === 'number') {
            return res.status(400).json({
                error: 'Invalid employee reference',
                message: 'Employee must be synced to server. Please use serverId instead of local id.',
                employeeId: req.body.employeeId
            });
        }

        const shift = new Shift({
            ...req.body,
            storeId: req.storeId
        });

        await shift.save();
        res.status(201).json(shift);
    } catch (error) {
        console.error('Create shift error:', error);
        res.status(500).json({ error: 'Failed to create shift' });
    }
});

/**
 * PUT /shifts/:id
 */
router.put('/:id', async (req, res) => {
    try {
        // Validate employeeId if provided - should be ObjectId, not number
        if (req.body.employeeId && typeof req.body.employeeId === 'number') {
            return res.status(400).json({
                error: 'Invalid employee reference',
                message: 'Employee must be synced to server. Please use serverId instead of local id.',
                employeeId: req.body.employeeId
            });
        }

        const shift = await Shift.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            { ...req.body },
            { new: true }
        );

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json(shift);
    } catch (error) {
        console.error('Update shift error:', error);
        res.status(500).json({ error: 'Failed to update shift' });
    }
});

/**
 * DELETE /shifts/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const shift = await Shift.findOneAndDelete({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json({ message: 'Shift deleted' });
    } catch (error) {
        console.error('Delete shift error:', error);
        res.status(500).json({ error: 'Failed to delete shift' });
    }
});

export default router;
