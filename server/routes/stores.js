/**
 * @fileoverview Store Management Routes
 *
 * API endpoints for managing multiple stores
 */

import express from 'express';
import { Store, User, Product, Sale, Customer, StockMovement } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors.js';
import { invalidateEntityCache } from '../services/cacheService.js';
import mongoose from 'mongoose';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/stores
 * Get all stores accessible to current user
 */
router.get('/', async (req, res) => {
    try {
        let stores;

        if (req.user.role === 'admin') {
            // Admin sees all stores
            stores = await Store.find({ isActive: true })
                .populate('ownerId', 'name email')
                .sort({ name: 1 });
        } else if (req.user.role === 'owner') {
            // Owner sees their own stores
            stores = await Store.find({ ownerId: req.userId, isActive: true })
                .sort({ name: 1 });
        } else {
            // Manager/Employee sees assigned stores
            stores = await Store.find({
                $or: [
                    { ownerId: req.userId },
                    { managers: req.userId }
                ],
                isActive: true
            }).sort({ name: 1 });
        }

        res.json(stores);
    } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({ error: 'Failed to get stores' });
    }
});

/**
 * GET /api/stores/:id
 * Get specific store details
 */
router.get('/:id', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id)
            .populate('ownerId', 'name email')
            .populate('managers', 'name email');

        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Check access
        if (!store.canAccess(req.userId) && req.user.role !== 'admin') {
            throw new AuthorizationError('You do not have access to this store');
        }

        res.json(store);
    } catch (error) {
        console.error('Get store error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/stores
 * Create a new store
 */
router.post('/', async (req, res) => {
    try {
        const store = new Store({
            ...req.body,
            ownerId: req.userId
        });

        await store.save();

        // Update user's currentStoreId if they don't have one
        const user = await User.findById(req.userId);
        if (!user.currentStoreId) {
            user.currentStoreId = store._id;
            user.storeId = store._id;
            await user.save();
        }

        res.status(201).json(store);
    } catch (error) {
        console.error('Create store error:', error);
        res.status(500).json({ error: 'Failed to create store' });
    }
});

/**
 * PUT /api/stores/:id
 * Update store details
 */
router.put('/:id', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);

        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Only owner or admin can update
        if (store.ownerId.toString() !== req.userId && req.user.role !== 'admin') {
            throw new AuthorizationError('Only store owner can update store details');
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            if (key !== 'ownerId' && key !== '_id') {
                store[key] = req.body[key];
            }
        });

        // Increment sync version
        store.syncVersion += 1;
        store.lastSyncedAt = new Date();

        await store.save();

        // Invalidate cache
        await invalidateEntityCache('stores', store._id);

        res.json(store);
    } catch (error) {
        console.error('Update store error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * DELETE /api/stores/:id
 * Soft delete store (set inactive)
 */
router.delete('/:id', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);

        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Only owner or admin can delete
        if (store.ownerId.toString() !== req.userId && req.user.role !== 'admin') {
            throw new AuthorizationError('Only store owner can delete store');
        }

        // Soft delete
        store.isActive = false;
        store.status = 'inactive';
        await store.save();

        res.json({ message: 'Store deactivated successfully' });
    } catch (error) {
        console.error('Delete store error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/stores/:id/managers
 * Add manager to store
 */
router.post('/:id/managers', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        const store = await Store.findById(req.params.id);
        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Only owner can add managers
        if (store.ownerId.toString() !== req.userId && req.user.role !== 'admin') {
            throw new AuthorizationError('Only store owner can add managers');
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Add manager to store
        store.addManager(userId);
        await store.save();

        // Add store to user's stores array
        if (!user.stores.includes(store._id)) {
            user.stores.push(store._id);
            if (!user.currentStoreId) {
                user.currentStoreId = store._id;
            }
            await user.save();
        }

        res.json({ message: 'Manager added successfully', store });
    } catch (error) {
        console.error('Add manager error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * DELETE /api/stores/:id/managers/:userId
 * Remove manager from store
 */
router.delete('/:id/managers/:userId', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Only owner can remove managers
        if (store.ownerId.toString() !== req.userId && req.user.role !== 'admin') {
            throw new AuthorizationError('Only store owner can remove managers');
        }

        // Remove manager from store
        store.removeManager(req.params.userId);
        await store.save();

        // Remove store from user's stores array
        const user = await User.findById(req.params.userId);
        if (user) {
            user.stores = user.stores.filter(
                storeId => storeId.toString() !== store._id.toString()
            );
            // If this was their current store, clear it
            if (user.currentStoreId && user.currentStoreId.toString() === store._id.toString()) {
                user.currentStoreId = user.stores[0] || null;
            }
            await user.save();
        }

        res.json({ message: 'Manager removed successfully' });
    } catch (error) {
        console.error('Remove manager error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/stores/:id/stats
 * Get store statistics
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Check access
        if (!store.canAccess(req.userId) && req.user.role !== 'admin') {
            throw new AuthorizationError('You do not have access to this store');
        }

        const storeId = store._id;

        // Get statistics
        const [productCount, salesCount, customerCount, todaySales] = await Promise.all([
            Product.countDocuments({ storeId, isActive: true }),
            Sale.countDocuments({ storeId, status: 'completed' }),
            Customer.countDocuments({ storeId }),
            Sale.aggregate([
                {
                    $match: {
                        storeId,
                        createdAt: {
                            $gte: new Date(new Date().setHours(0, 0, 0, 0))
                        },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$total' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        res.json({
            storeId: store._id,
            storeName: store.name,
            products: productCount,
            totalSales: salesCount,
            customers: customerCount,
            todaySales: {
                revenue: todaySales[0]?.total || 0,
                transactions: todaySales[0]?.count || 0
            }
        });
    } catch (error) {
        console.error('Get store stats error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/stores/switch
 * Switch active store for current user
 */
router.post('/switch', async (req, res) => {
    try {
        const { storeId } = req.body;

        if (!storeId) {
            throw new ValidationError('Store ID is required');
        }

        const store = await Store.findById(storeId);
        if (!store) {
            throw new NotFoundError('Store not found');
        }

        // Check access
        if (!store.canAccess(req.userId) && req.user.role !== 'admin') {
            throw new AuthorizationError('You do not have access to this store');
        }

        // Update user's current store
        const user = await User.findById(req.userId);
        user.currentStoreId = storeId;
        user.storeId = storeId; // Keep backward compatibility
        await user.save();

        res.json({ message: 'Store switched successfully', currentStoreId: storeId });
    } catch (error) {
        console.error('Switch store error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/stores/compare
 * Compare performance across multiple stores
 * Query params: storeIds (comma-separated), startDate, endDate
 */
router.get('/compare', async (req, res) => {
    try {
        const { storeIds, startDate, endDate } = req.query;

        if (!storeIds) {
            throw new ValidationError('Store IDs are required (comma-separated)');
        }

        // Parse store IDs
        const storeIdArray = storeIds.split(',').map(id => {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new ValidationError(`Invalid store ID: ${id}`);
            }
            return new mongoose.Types.ObjectId(id);
        });

        // Verify user has access to all stores
        const stores = await Store.find({ _id: { $in: storeIdArray }, isActive: true });

        if (stores.length !== storeIdArray.length) {
            throw new NotFoundError('One or more stores not found');
        }

        // Check access for all stores
        for (const store of stores) {
            if (!store.canAccess(req.userId) && req.user.role !== 'admin') {
                throw new AuthorizationError(`You do not have access to store: ${store.name}`);
            }
        }

        // Date range
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }

        // Build match query
        const matchQuery = {
            storeId: { $in: storeIdArray },
            status: 'completed'
        };
        if (Object.keys(dateFilter).length > 0) {
            matchQuery.createdAt = dateFilter;
        }

        // Get comparison data for each store
        const comparisonData = await Promise.all(
            stores.map(async (store) => {
                const storeMatchQuery = { ...matchQuery, storeId: store._id };

                // Sales metrics
                const salesStats = await Sale.aggregate([
                    { $match: storeMatchQuery },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$total' },
                            totalTransactions: { $sum: 1 },
                            avgBasketSize: { $avg: '$total' }
                        }
                    }
                ]);

                // Product and customer counts
                const [productCount, customerCount, lowStockCount] = await Promise.all([
                    Product.countDocuments({ storeId: store._id, isActive: true }),
                    Customer.countDocuments({ storeId: store._id }),
                    Product.countDocuments({
                        storeId: store._id,
                        isActive: true,
                        $expr: { $lte: ['$quantity', '$reorderPoint'] }
                    })
                ]);

                // Inventory value
                const inventoryValue = await Product.aggregate([
                    { $match: { storeId: store._id, isActive: true } },
                    {
                        $group: {
                            _id: null,
                            totalValue: {
                                $sum: {
                                    $multiply: ['$quantity', { $ifNull: ['$costPrice', '$price'] }]
                                }
                            }
                        }
                    }
                ]);

                return {
                    storeId: store._id,
                    storeName: store.name,
                    metrics: {
                        sales: {
                            revenue: salesStats[0]?.totalRevenue || 0,
                            transactions: salesStats[0]?.totalTransactions || 0,
                            avgBasketSize: salesStats[0]?.avgBasketSize || 0
                        },
                        inventory: {
                            totalProducts: productCount,
                            inventoryValue: inventoryValue[0]?.totalValue || 0,
                            lowStockItems: lowStockCount
                        },
                        customers: customerCount
                    }
                };
            })
        );

        // Calculate totals and rankings
        const totals = comparisonData.reduce((acc, store) => ({
            revenue: acc.revenue + store.metrics.sales.revenue,
            transactions: acc.transactions + store.metrics.sales.transactions,
            products: acc.products + store.metrics.inventory.totalProducts,
            customers: acc.customers + store.metrics.customers,
            inventoryValue: acc.inventoryValue + store.metrics.inventory.inventoryValue
        }), { revenue: 0, transactions: 0, products: 0, customers: 0, inventoryValue: 0 });

        // Rank stores by revenue
        const ranked = [...comparisonData].sort((a, b) =>
            b.metrics.sales.revenue - a.metrics.sales.revenue
        );

        res.json({
            stores: comparisonData,
            totals,
            rankings: {
                byRevenue: ranked.map((s, i) => ({
                    rank: i + 1,
                    storeId: s.storeId,
                    storeName: s.storeName,
                    revenue: s.metrics.sales.revenue
                }))
            },
            dateRange: {
                startDate: startDate || 'All time',
                endDate: endDate || 'Now'
            }
        });
    } catch (error) {
        console.error('Store comparison error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * GET /api/stores/analytics/cross-store
 * Get aggregated analytics across all accessible stores
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
router.get('/analytics/cross-store', async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        // Get all accessible stores
        let stores;
        if (req.user.role === 'admin') {
            stores = await Store.find({ isActive: true });
        } else if (req.user.role === 'owner') {
            stores = await Store.find({ ownerId: req.userId, isActive: true });
        } else {
            stores = await Store.find({
                $or: [
                    { ownerId: req.userId },
                    { managers: req.userId }
                ],
                isActive: true
            });
        }

        const storeIds = stores.map(s => s._id);

        if (storeIds.length === 0) {
            return res.json({
                stores: [],
                aggregated: {
                    totalRevenue: 0,
                    totalTransactions: 0,
                    totalProducts: 0,
                    totalCustomers: 0
                },
                timeSeries: []
            });
        }

        // Date range
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }

        const matchQuery = {
            storeId: { $in: storeIds },
            status: 'completed'
        };
        if (Object.keys(dateFilter).length > 0) {
            matchQuery.createdAt = dateFilter;
        }

        // Determine grouping format
        const dateFormats = {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        };

        // Time series aggregation
        const timeSeries = await Sale.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: dateFormats[groupBy] || dateFormats.day,
                    revenue: { $sum: '$total' },
                    transactions: { $sum: 1 },
                    avgBasketSize: { $avg: '$total' }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    revenue: 1,
                    transactions: 1,
                    avgBasketSize: 1
                }
            }
        ]);

        // Aggregated totals
        const aggregated = await Sale.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalTransactions: { $sum: 1 },
                    avgBasketSize: { $avg: '$total' }
                }
            }
        ]);

        // Get product and customer counts
        const [totalProducts, totalCustomers] = await Promise.all([
            Product.countDocuments({ storeId: { $in: storeIds }, isActive: true }),
            Customer.countDocuments({ storeId: { $in: storeIds } })
        ]);

        res.json({
            stores: stores.map(s => ({ id: s._id, name: s.name })),
            aggregated: {
                totalRevenue: aggregated[0]?.totalRevenue || 0,
                totalTransactions: aggregated[0]?.totalTransactions || 0,
                avgBasketSize: aggregated[0]?.avgBasketSize || 0,
                totalProducts,
                totalCustomers
            },
            timeSeries,
            dateRange: {
                startDate: startDate || 'All time',
                endDate: endDate || 'Now',
                groupBy
            }
        });
    } catch (error) {
        console.error('Cross-store analytics error:', error);
        res.status(500).json({ error: 'Failed to get cross-store analytics' });
    }
});

/**
 * POST /api/stores/transfer
 * Transfer inventory between stores
 * Body: { fromStoreId, toStoreId, productId, quantity, reason, notes }
 */
router.post('/transfer', async (req, res) => {
    try {
        const { fromStoreId, toStoreId, productId, quantity, reason, notes } = req.body;

        // Validation
        if (!fromStoreId || !toStoreId || !productId || !quantity) {
            throw new ValidationError('fromStoreId, toStoreId, productId, and quantity are required');
        }

        if (quantity <= 0) {
            throw new ValidationError('Quantity must be greater than 0');
        }

        if (fromStoreId === toStoreId) {
            throw new ValidationError('Cannot transfer to the same store');
        }

        // Verify stores exist and user has access
        const [fromStore, toStore] = await Promise.all([
            Store.findById(fromStoreId),
            Store.findById(toStoreId)
        ]);

        if (!fromStore) {
            throw new NotFoundError('Source store not found');
        }
        if (!toStore) {
            throw new NotFoundError('Destination store not found');
        }

        // Check access to both stores (must be owner, manager, or admin)
        if (!fromStore.canAccess(req.userId) && req.user.role !== 'admin') {
            throw new AuthorizationError('You do not have access to the source store');
        }
        if (!toStore.canAccess(req.userId) && req.user.role !== 'admin') {
            throw new AuthorizationError('You do not have access to the destination store');
        }

        // Get products from both stores
        const fromProduct = await Product.findOne({ _id: productId, storeId: fromStoreId });
        const toProduct = await Product.findOne({ _id: productId, storeId: toStoreId });

        if (!fromProduct) {
            throw new NotFoundError('Product not found in source store');
        }

        // Check if source store has enough quantity
        if (fromProduct.quantity < quantity) {
            throw new ValidationError(
                `Insufficient quantity in source store. Available: ${fromProduct.quantity}, Requested: ${quantity}`
            );
        }

        // If product doesn't exist in destination store, create it
        let toProductDoc;
        if (!toProduct) {
            // Clone product to destination store
            toProductDoc = new Product({
                ...fromProduct.toObject(),
                _id: undefined,
                storeId: toStoreId,
                quantity: quantity,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await toProductDoc.save();
        } else {
            // Update existing product quantity
            toProduct.quantity += quantity;
            await toProduct.save();
            toProductDoc = toProduct;
        }

        // Update source product quantity
        fromProduct.quantity -= quantity;
        await fromProduct.save();

        // Create stock movement records
        const transferOutMovement = await StockMovement.createMovement({
            storeId: fromStoreId,
            productId: productId,
            type: 'transfer_out',
            quantity: -quantity,
            reason: reason || 'Inventory transfer',
            referenceType: 'store_transfer',
            referenceId: toStoreId,
            fromLocation: fromStore.name,
            toLocation: toStore.name,
            performedBy: req.userId,
            notes
        });

        const transferInMovement = await StockMovement.createMovement({
            storeId: toStoreId,
            productId: toProductDoc._id,
            type: 'transfer_in',
            quantity: quantity,
            reason: reason || 'Inventory transfer',
            referenceType: 'store_transfer',
            referenceId: fromStoreId,
            fromLocation: fromStore.name,
            toLocation: toStore.name,
            performedBy: req.userId,
            notes
        });

        // Invalidate caches
        await Promise.all([
            invalidateEntityCache('products', fromProduct._id),
            invalidateEntityCache('products', toProductDoc._id)
        ]);

        res.json({
            message: 'Inventory transferred successfully',
            transfer: {
                from: {
                    storeId: fromStoreId,
                    storeName: fromStore.name,
                    productId: fromProduct._id,
                    newQuantity: fromProduct.quantity,
                    movementId: transferOutMovement._id
                },
                to: {
                    storeId: toStoreId,
                    storeName: toStore.name,
                    productId: toProductDoc._id,
                    newQuantity: toProductDoc.quantity,
                    movementId: transferInMovement._id
                },
                quantity,
                performedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Inventory transfer error:', error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
