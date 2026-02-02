/**
 * @fileoverview Employee Routes
 */

import express from 'express';
import { Employee, ClockEvent, Sale } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /employees
 * Get all employees for the store
 */
router.get('/', async (req, res) => {
    try {
        const employees = await Employee.find({ storeId: req.storeId })
            .sort({ name: 1 });
        res.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Failed to get employees' });
    }
});

/**
 * GET /employees/:id
 * Get single employee
 */
router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Failed to get employee' });
    }
});

/**
 * POST /employees
 * Create new employee
 */
router.post('/', async (req, res) => {
    try {
        const employee = new Employee({
            ...req.body,
            storeId: req.storeId
        });

        await employee.save();
        res.status(201).json(employee);
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

/**
 * PUT /employees/:id
 * Update employee
 */
router.put('/:id', async (req, res) => {
    try {
        const employee = await Employee.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

/**
 * DELETE /employees/:id
 * Delete employee
 */
router.delete('/:id', async (req, res) => {
    try {
        const employee = await Employee.findOneAndDelete({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ message: 'Employee deleted' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

/**
 * GET /employees/:id/performance
 * Get employee performance stats
 */
router.get('/:id/performance', async (req, res) => {
    try {
        const employeeId = req.params.id;

        // Get clock events
        const clockEvents = await ClockEvent.find({
            storeId: req.storeId,
            employeeId
        }).sort({ clockIn: -1 });

        // Get sales
        const sales = await Sale.find({
            storeId: req.storeId,
            employeeId
        });

        // Calculate stats
        const totalShifts = clockEvents.filter(e => e.clockOut).length;
        const totalHours = clockEvents.reduce((sum, e) => {
            if (e.clockIn && e.clockOut) {
                return sum + (new Date(e.clockOut) - new Date(e.clockIn)) / (1000 * 60 * 60);
            }
            return sum;
        }, 0);

        res.json({
            totalShifts,
            totalHours: totalHours.toFixed(1),
            totalSales: sales.length,
            totalRevenue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
            recentShifts: clockEvents.slice(0, 5)
        });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({ error: 'Failed to get performance data' });
    }
});

/**
 * POST /employees/clock
 * Clock in or out by PIN
 */
router.post('/clock', async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin || pin.length !== 4) {
            return res.status(400).json({ error: 'Invalid PIN' });
        }

        // Find employee by PIN
        const employee = await Employee.findOne({
            storeId: req.storeId,
            pin,
            isActive: true
        });

        if (!employee) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Check for active clock event
        const activeEvent = await ClockEvent.findOne({
            storeId: req.storeId,
            employeeId: employee._id,
            clockOut: null
        });

        if (activeEvent) {
            // Clock out
            const clockOut = new Date();

            // Calculate shift summary
            const sales = await Sale.find({
                storeId: req.storeId,
                employeeId: employee._id,
                createdAt: {
                    $gte: activeEvent.clockIn,
                    $lte: clockOut
                }
            });

            const summary = {
                salesCount: sales.length,
                salesTotal: sales.reduce((sum, s) => sum + (s.total || 0), 0),
                itemsSold: sales.reduce((sum, s) => sum + (s.items?.length || 0), 0)
            };

            activeEvent.clockOut = clockOut;
            activeEvent.salesCount = summary.salesCount;
            activeEvent.salesTotal = summary.salesTotal;
            activeEvent.itemsSold = summary.itemsSold;
            await activeEvent.save();

            res.json({
                action: 'clock_out',
                employee: employee.getSafeInfo(),
                clockEvent: activeEvent,
                summary
            });
        } else {
            // Clock in
            const clockEvent = new ClockEvent({
                storeId: req.storeId,
                employeeId: employee._id,
                clockIn: new Date()
            });
            await clockEvent.save();

            res.json({
                action: 'clock_in',
                employee: employee.getSafeInfo(),
                clockEvent
            });
        }
    } catch (error) {
        console.error('Clock error:', error);
        res.status(500).json({ error: 'Clock action failed' });
    }
});

/**
 * GET /employees/on-duty
 * Get currently clocked-in employees
 */
router.get('/status/on-duty', async (req, res) => {
    try {
        const activeEvents = await ClockEvent.find({
            storeId: req.storeId,
            clockOut: null
        }).populate('employeeId', 'name role');

        const onDuty = activeEvents.map(event => ({
            employee: event.employeeId,
            clockIn: event.clockIn
        }));

        res.json(onDuty);
    } catch (error) {
        console.error('Get on-duty error:', error);
        res.status(500).json({ error: 'Failed to get on-duty employees' });
    }
});

export default router;
