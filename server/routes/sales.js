/**
 * @fileoverview Sales Routes
 */

import express from 'express';
import { Sale, Product, Customer, Credit } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import * as notificationService from '../services/notificationService.js';
import { invalidateEntityCache } from '../services/cacheService.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /sales
 */
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, employeeId, customerId, limit = 100 } = req.query;

        const query = { storeId: req.storeId };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (employeeId) query.employeeId = employeeId;
        if (customerId) query.customerId = customerId;

        const sales = await Sale.find(query)
            .populate('employeeId', 'name')
            .populate('customerId', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Failed to get sales' });
    }
});

/**
 * GET /sales/stats
 * Get sales statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const [todaySales, weekSales, monthSales] = await Promise.all([
            Sale.find({ storeId: req.storeId, createdAt: { $gte: today } }),
            Sale.find({ storeId: req.storeId, createdAt: { $gte: weekAgo } }),
            Sale.find({ storeId: req.storeId, createdAt: { $gte: monthAgo } })
        ]);

        res.json({
            today: {
                count: todaySales.length,
                revenue: todaySales.reduce((sum, s) => sum + s.total, 0)
            },
            week: {
                count: weekSales.length,
                revenue: weekSales.reduce((sum, s) => sum + s.total, 0)
            },
            month: {
                count: monthSales.length,
                revenue: monthSales.reduce((sum, s) => sum + s.total, 0)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * GET /sales/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const sale = await Sale.findOne({
            _id: req.params.id,
            storeId: req.storeId
        }).populate('employeeId', 'name').populate('customerId', 'name');

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json(sale);
    } catch (error) {
        console.error('Get sale error:', error);
        res.status(500).json({ error: 'Failed to get sale' });
    }
});

/**
 * POST /sales
 * Create new sale and update inventory
 */
router.post('/', async (req, res) => {
    try {
        const saleData = {
            ...req.body,
            storeId: req.storeId,
            userId: req.userId
        };

        // Validate productIds - they should be ObjectIds, not numbers
        if (saleData.items && Array.isArray(saleData.items)) {
            for (let i = 0; i < saleData.items.length; i++) {
                const item = saleData.items[i];
                if (typeof item.productId === 'number') {
                    return res.status(400).json({
                        error: 'Invalid product reference',
                        message: 'Products must be synced to server before creating sales. Please ensure products are synced and use serverId instead of local id.',
                        itemIndex: i,
                        productId: item.productId
                    });
                }
            }
        }

        // Validate customerId if provided
        if (saleData.customerId && typeof saleData.customerId === 'number') {
            return res.status(400).json({
                error: 'Invalid customer reference',
                message: 'Customer must be synced to server. Please use serverId instead of local id.',
                customerId: saleData.customerId
            });
        }

        // Validate employeeId - set to null if it's a number (not synced)
        if (saleData.employeeId && typeof saleData.employeeId === 'number') {
            console.warn('Employee not synced, setting employeeId to null');
            saleData.employeeId = null;
        }

        // Validate shiftId - set to null if it's a number (not synced)
        if (saleData.shiftId && typeof saleData.shiftId === 'number') {
            console.warn('Shift not synced, setting shiftId to null');
            saleData.shiftId = null;
        }

        const sale = new Sale(saleData);
        await sale.save();

        // Update product quantities
        for (const item of sale.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: -item.quantity }
            });
        }

        // Update customer stats if customer provided
        if (sale.customerId) {
            await Customer.findByIdAndUpdate(sale.customerId, {
                $inc: {
                    totalOrders: 1,
                    totalSpent: sale.total
                },
                lastOrderDate: new Date()
            });
        }

        // Create credit record if credit payment
        let credit = null;
        if (sale.paymentMethod === 'credit' && sale.customerId) {
            credit = new Credit({
                storeId: req.storeId,
                customerId: sale.customerId,
                saleId: sale._id,
                amount: sale.total,
                amountPaid: 0,
                dueDate: req.body.creditDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'pending'
            });
            await credit.save();
        }

        // Create notifications
        const io = req.app.get('io');

        // 1. New sale notification
        const saleNotification = await notificationService.createNewSaleNotification(req.storeId, sale);
        if (io) {
            notificationService.broadcastNotification(io, req.storeId, saleNotification);
        }

        // 2. Large sale notification (if total > $100)
        if (sale.total > 100) {
            const largeSaleNotification = await notificationService.createLargeSaleNotification(req.storeId, sale, 100);
            if (io) {
                notificationService.broadcastNotification(io, req.storeId, largeSaleNotification);
            }
        }

        // 3. Credit payment notification
        if (credit) {
            const customer = await Customer.findById(sale.customerId);
            if (customer) {
                const creditNotification = await notificationService.createCreditPaymentNotification(
                    req.storeId,
                    credit,
                    customer
                );
                if (io) {
                    notificationService.broadcastNotification(io, req.storeId, creditNotification);
                }
            }
        }

        // Invalidate analytics cache so Dashboard/Analytics show updated data
        await invalidateEntityCache('sales', req.storeId);

        res.status(201).json(sale);
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Failed to create sale' });
    }
});

/**
 * POST /sales/:id/void
 * Void a sale
 */
router.post('/:id/void', async (req, res) => {
    try {
        const sale = await Sale.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        if (sale.status === 'voided') {
            return res.status(400).json({ error: 'Sale already voided' });
        }

        sale.status = 'voided';
        await sale.save();

        // Restore product quantities
        for (const item of sale.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: item.quantity }
            });
        }

        res.json({ message: 'Sale voided', sale });
    } catch (error) {
        console.error('Void sale error:', error);
        res.status(500).json({ error: 'Failed to void sale' });
    }
});

export default router;
