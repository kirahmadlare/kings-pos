/**
 * @fileoverview Advanced Inventory Routes
 *
 * API endpoints for inventory forecasting, alerts, and purchase orders
 */

import express from 'express';
import { Product, InventoryAlert, PurchaseOrder, StockMovement, Supplier } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { TTL } from '../services/cacheService.js';
import {
    forecastDemand,
    calculateReorderPoint,
    performABCAnalysis,
    identifySlowMovers,
    calculateTurnoverRate
} from '../services/inventoryService.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/inventory/suppliers
 * Get all suppliers
 */
router.get('/suppliers', async (req, res) => {
    try {
        const { isActive } = req.query;

        const query = { storeId: req.storeId };
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const suppliers = await Supplier.find(query).sort({ name: 1 });

        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: 'Failed to get suppliers' });
    }
});

/**
 * GET /api/inventory/suppliers/:id
 * Get a single supplier
 */
router.get('/suppliers/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json(supplier);
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({ error: 'Failed to get supplier' });
    }
});

/**
 * POST /api/inventory/suppliers
 * Create a new supplier
 */
router.post('/suppliers', async (req, res) => {
    try {
        const supplier = await Supplier.create({
            ...req.body,
            storeId: req.storeId
        });

        res.status(201).json(supplier);
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

/**
 * PUT /api/inventory/suppliers/:id
 * Update a supplier
 */
router.put('/suppliers/:id', async (req, res) => {
    try {
        const { storeId, _id, createdAt, totalOrders, totalSpent, lastOrderDate, ...updateData } = req.body;

        const supplier = await Supplier.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json(supplier);
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

/**
 * DELETE /api/inventory/suppliers/:id
 * Delete a supplier (soft delete by setting isActive to false)
 */
router.delete('/suppliers/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            { isActive: false },
            { new: true }
        );

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json({ message: 'Supplier deactivated', supplier });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

/**
 * GET /api/inventory/forecast/:productId
 * Get demand forecast for a product
 */
router.get('/forecast/:productId', cacheMiddleware({ namespace: 'inventory', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { productId } = req.params;
        const { daysAhead = 30 } = req.query;

        const forecast = await forecastDemand(productId, req.storeId, parseInt(daysAhead));

        res.json(forecast);
    } catch (error) {
        console.error('Forecast error:', error);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});

/**
 * GET /api/inventory/reorder-point/:productId
 * Calculate reorder point for a product
 */
router.get('/reorder-point/:productId', cacheMiddleware({ namespace: 'inventory', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { productId } = req.params;
        const { leadTimeDays = 7 } = req.query;

        const reorderPoint = await calculateReorderPoint(productId, req.storeId, parseInt(leadTimeDays));

        res.json(reorderPoint);
    } catch (error) {
        console.error('Reorder point error:', error);
        res.status(500).json({ error: 'Failed to calculate reorder point' });
    }
});

/**
 * GET /api/inventory/abc-analysis
 * Perform ABC analysis on inventory
 */
router.get('/abc-analysis', cacheMiddleware({ namespace: 'inventory', ttl: TTL.LONG }), async (req, res) => {
    try {
        const analysis = await performABCAnalysis(req.storeId);

        res.json(analysis);
    } catch (error) {
        console.error('ABC analysis error:', error);
        res.status(500).json({ error: 'Failed to perform ABC analysis' });
    }
});

/**
 * GET /api/inventory/slow-movers
 * Identify slow-moving and dead stock
 */
router.get('/slow-movers', cacheMiddleware({ namespace: 'inventory', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { daysSinceLastSale = 90 } = req.query;

        const slowMovers = await identifySlowMovers(req.storeId, parseInt(daysSinceLastSale));

        res.json(slowMovers);
    } catch (error) {
        console.error('Slow movers error:', error);
        res.status(500).json({ error: 'Failed to identify slow movers' });
    }
});

/**
 * GET /api/inventory/turnover
 * Calculate inventory turnover rate
 */
router.get('/turnover', cacheMiddleware({ namespace: 'inventory', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { periodDays = 365 } = req.query;

        const turnover = await calculateTurnoverRate(req.storeId, parseInt(periodDays));

        res.json(turnover);
    } catch (error) {
        console.error('Turnover calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate turnover rate' });
    }
});

/**
 * GET /api/inventory/alerts
 * Get all active inventory alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { type, severity, isActive = true } = req.query;

        const query = { storeId: req.storeId };
        if (type) query.type = type;
        if (severity) query.severity = severity;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const alerts = await InventoryAlert.find(query)
            .populate('productId', 'name sku quantity')
            .sort({ triggeredAt: -1 })
            .limit(100);

        res.json(alerts);
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

/**
 * POST /api/inventory/alerts
 * Create a new inventory alert
 */
router.post('/alerts', authenticate, async (req, res) => {
    try {
        // Validate productId - should be ObjectId, not number
        if (req.body.productId && typeof req.body.productId === 'number') {
            return res.status(400).json({
                error: 'Invalid product reference',
                message: 'Product must be synced to server. Please use serverId instead of local id.',
                productId: req.body.productId
            });
        }

        const alert = await InventoryAlert.create({
            ...req.body,
            storeId: req.storeId
        });

        res.status(201).json(alert);
    } catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

/**
 * PUT /api/inventory/alerts/:id/resolve
 * Resolve an alert
 */
router.put('/alerts/:id/resolve', authenticate, async (req, res) => {
    try {
        const alert = await InventoryAlert.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alert.resolve(req.user._id);

        res.json(alert);
    } catch (error) {
        console.error('Resolve alert error:', error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

/**
 * GET /api/inventory/purchase-orders
 * Get all purchase orders
 */
router.get('/purchase-orders', async (req, res) => {
    try {
        const { status } = req.query;

        const query = { storeId: req.storeId };
        if (status) query.status = status;

        const orders = await PurchaseOrder.find(query)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .populate('items.productId', 'name sku')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Get purchase orders error:', error);
        res.status(500).json({ error: 'Failed to get purchase orders' });
    }
});

/**
 * POST /api/inventory/purchase-orders
 * Create a new purchase order
 */
router.post('/purchase-orders', authenticate, async (req, res) => {
    try {
        // Validate supplierId - should be ObjectId, not number
        if (req.body.supplierId && typeof req.body.supplierId === 'number') {
            return res.status(400).json({
                error: 'Invalid supplier reference',
                message: 'Supplier must be synced to server. Please use serverId instead of local id.',
                supplierId: req.body.supplierId
            });
        }

        // Validate productIds in items array
        if (req.body.items && Array.isArray(req.body.items)) {
            for (let i = 0; i < req.body.items.length; i++) {
                const item = req.body.items[i];
                if (typeof item.productId === 'number') {
                    return res.status(400).json({
                        error: 'Invalid product reference',
                        message: 'Products must be synced to server. Please use serverId instead of local id.',
                        itemIndex: i,
                        productId: item.productId
                    });
                }
            }
        }

        const orderNumber = await PurchaseOrder.generateOrderNumber();

        const order = await PurchaseOrder.create({
            ...req.body,
            storeId: req.storeId,
            orderNumber,
            createdBy: req.user._id
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Create purchase order error:', error);
        res.status(500).json({ error: 'Failed to create purchase order' });
    }
});

/**
 * PUT /api/inventory/purchase-orders/:id/approve
 * Approve a purchase order
 */
router.put('/purchase-orders/:id/approve', authenticate, async (req, res) => {
    try {
        const order = await PurchaseOrder.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        await order.approve(req.user._id);

        res.json(order);
    } catch (error) {
        console.error('Approve purchase order error:', error);
        res.status(500).json({ error: 'Failed to approve purchase order' });
    }
});

/**
 * PUT /api/inventory/purchase-orders/:id/receive
 * Receive items from a purchase order
 */
router.put('/purchase-orders/:id/receive', authenticate, async (req, res) => {
    try {
        const { receivedItems } = req.body;
        console.log('📦 Receiving PO:', req.params.id);
        console.log('📦 Received items:', JSON.stringify(receivedItems, null, 2));

        const order = await PurchaseOrder.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        console.log('📦 Order found:', order.orderNumber);
        await order.receiveItems(receivedItems, req.user._id);

        // Update product quantities
        console.log('📦 Processing', receivedItems.length, 'items...');
        for (const received of receivedItems) {
            const item = order.items.id(received.itemId);
            console.log('📦 Item:', received.itemId, '- Product:', item?.productId, '- Qty:', received.quantity);

            if (item && received.quantity > 0) {
                console.log('📦 Creating stock movement for product:', item.productId, 'qty:', received.quantity);
                const movement = await StockMovement.createMovement({
                    storeId: req.storeId,
                    productId: item.productId,
                    type: 'purchase',
                    quantity: received.quantity,
                    reason: `Received from PO ${order.orderNumber}`,
                    referenceType: 'PurchaseOrder',
                    referenceId: order._id,
                    performedBy: req.user._id
                });
                console.log('✅ Stock movement created:', movement._id, '- New qty:', movement.newQuantity);
            } else {
                console.log('⚠️ Skipping item (no item or qty=0)');
            }
        }

        console.log('✅ PO received successfully');
        res.json(order);
    } catch (error) {
        console.error('❌ Receive purchase order error:', error);
        res.status(500).json({ error: 'Failed to receive purchase order' });
    }
});

/**
 * PUT /api/inventory/purchase-orders/:id/cancel
 * Cancel a purchase order
 */
router.put('/purchase-orders/:id/cancel', authenticate, async (req, res) => {
    try {
        const order = await PurchaseOrder.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({ error: 'Purchase order already cancelled' });
        }

        if (order.status === 'received') {
            return res.status(400).json({ error: 'Cannot cancel a received purchase order' });
        }

        order.status = 'cancelled';
        await order.save();

        res.json(order);
    } catch (error) {
        console.error('Cancel purchase order error:', error);
        res.status(500).json({ error: 'Failed to cancel purchase order' });
    }
});

/**
 * GET /api/inventory/movements
 * Get stock movement history
 */
router.get('/movements', async (req, res) => {
    try {
        const { productId, type, startDate, endDate, limit = 50 } = req.query;

        const query = { storeId: req.storeId };
        if (productId) query.productId = productId;
        if (type) query.type = type;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const movements = await StockMovement.find(query)
            .populate('productId', 'name sku')
            .populate('performedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json(movements);
    } catch (error) {
        console.error('Get movements error:', error);
        res.status(500).json({ error: 'Failed to get stock movements' });
    }
});

/**
 * POST /api/inventory/movements
 * Create a stock movement (adjustment)
 */
router.post('/movements', authenticate, async (req, res) => {
    try {
        // Validate productId - should be ObjectId, not number
        if (req.body.productId && typeof req.body.productId === 'number') {
            return res.status(400).json({
                error: 'Invalid product reference',
                message: 'Product must be synced to server. Please use serverId instead of local id.',
                productId: req.body.productId
            });
        }

        const movement = await StockMovement.createMovement({
            ...req.body,
            storeId: req.storeId,
            performedBy: req.user._id
        });

        res.status(201).json(movement);
    } catch (error) {
        console.error('Create movement error:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
