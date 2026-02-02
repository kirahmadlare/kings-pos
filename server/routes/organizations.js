/**
 * @fileoverview Organization Routes
 *
 * API endpoints for managing organizations and store groups
 */

import express from 'express';
import { Organization, StoreGroup, Store, User, Sale, Product, Customer } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// ORGANIZATION ROUTES
// ============================================

/**
 * GET /api/organizations
 * Get all organizations (for super admin) or user's organization
 */
router.get('/', async (req, res) => {
    try {
        const { userId, user } = req;

        let query = {};

        // If not super admin, only show user's organization
        if (user.role !== 'super_admin') {
            query.ownerId = userId;
        }

        const organizations = await Organization.find(query)
            .populate('ownerId', 'name email')
            .sort({ createdAt: -1 });

        res.json(organizations);
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

/**
 * GET /api/organizations/:id
 * Get organization details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, user } = req;

        const organization = await Organization.findById(id)
            .populate('ownerId', 'name email');

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId._id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get store count
        const storeCount = await Store.countDocuments({ organizationId: id });

        res.json({
            ...organization.toObject(),
            storeCount
        });
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

/**
 * POST /api/organizations
 * Create new organization
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req;
        const { name, email, phone, address, settings, subscription } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        const organization = await Organization.create({
            name,
            email,
            phone,
            address,
            settings,
            subscription,
            ownerId: userId
        });

        res.status(201).json(organization);
    } catch (error) {
        console.error('Create organization error:', error);
        res.status(500).json({ error: 'Failed to create organization' });
    }
});

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, user } = req;
        const updates = req.body;

        const organization = await Organization.findById(id);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Don't allow changing ownerId
        delete updates.ownerId;

        Object.assign(organization, updates);
        await organization.save();

        res.json(organization);
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

/**
 * DELETE /api/organizations/:id
 * Delete organization (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, user } = req;

        const organization = await Organization.findById(id);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Soft delete
        organization.isActive = false;
        await organization.save();

        res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
        console.error('Delete organization error:', error);
        res.status(500).json({ error: 'Failed to delete organization' });
    }
});

/**
 * GET /api/organizations/:id/stats
 * Get aggregated statistics for organization
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, user } = req;

        const organization = await Organization.findById(id);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get all stores in organization
        const stores = await Store.find({ organizationId: id, isActive: true });
        const storeIds = stores.map(s => s._id);

        // Get time ranges
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Aggregate sales data
        const [todaySales, weekSales, monthSales, totalSales] = await Promise.all([
            Sale.aggregate([
                { $match: { storeId: { $in: storeIds }, createdAt: { $gte: today }, status: 'completed' } },
                { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
            ]),
            Sale.aggregate([
                { $match: { storeId: { $in: storeIds }, createdAt: { $gte: thisWeekStart }, status: 'completed' } },
                { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
            ]),
            Sale.aggregate([
                { $match: { storeId: { $in: storeIds }, createdAt: { $gte: thisMonthStart }, status: 'completed' } },
                { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
            ]),
            Sale.aggregate([
                { $match: { storeId: { $in: storeIds }, status: 'completed' } },
                { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
            ])
        ]);

        // Aggregate inventory data
        const [totalProducts, lowStockProducts, outOfStockProducts] = await Promise.all([
            Product.countDocuments({ storeId: { $in: storeIds }, isActive: true }),
            Product.countDocuments({
                storeId: { $in: storeIds },
                isActive: true,
                $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
            }),
            Product.countDocuments({ storeId: { $in: storeIds }, isActive: true, quantity: 0 })
        ]);

        // Aggregate customer data
        const [totalCustomers, newCustomersThisMonth] = await Promise.all([
            Customer.countDocuments({ storeId: { $in: storeIds } }),
            Customer.countDocuments({ storeId: { $in: storeIds }, createdAt: { $gte: thisMonthStart } })
        ]);

        // Get top performing stores
        const topStores = await Sale.aggregate([
            { $match: { storeId: { $in: storeIds }, createdAt: { $gte: thisMonthStart }, status: 'completed' } },
            { $group: { _id: '$storeId', revenue: { $sum: '$total' }, transactions: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);

        // Populate store names
        const topStoresWithNames = await Promise.all(
            topStores.map(async (store) => {
                const storeData = await Store.findById(store._id);
                return {
                    storeId: store._id,
                    storeName: storeData?.name || 'Unknown',
                    revenue: store.revenue,
                    transactions: store.transactions
                };
            })
        );

        res.json({
            organizationId: id,
            organizationName: organization.name,
            storeCount: stores.length,
            activeStores: stores.filter(s => s.status === 'active').length,

            sales: {
                today: {
                    revenue: todaySales[0]?.revenue || 0,
                    transactions: todaySales[0]?.count || 0
                },
                week: {
                    revenue: weekSales[0]?.revenue || 0,
                    transactions: weekSales[0]?.count || 0
                },
                month: {
                    revenue: monthSales[0]?.revenue || 0,
                    transactions: monthSales[0]?.count || 0
                },
                total: {
                    revenue: totalSales[0]?.revenue || 0,
                    transactions: totalSales[0]?.count || 0
                }
            },

            inventory: {
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                healthPercentage: totalProducts > 0
                    ? ((totalProducts - lowStockProducts - outOfStockProducts) / totalProducts * 100).toFixed(1)
                    : 100
            },

            customers: {
                total: totalCustomers,
                newThisMonth: newCustomersThisMonth
            },

            topStores: topStoresWithNames,

            stores: stores.map(s => ({
                id: s._id,
                name: s.name,
                status: s.status,
                storeType: s.storeType,
                address: s.address
            }))
        });
    } catch (error) {
        console.error('Get organization stats error:', error);
        res.status(500).json({ error: 'Failed to fetch organization stats' });
    }
});

/**
 * GET /api/organizations/:id/reports
 * Get consolidated reports across all stores
 */
router.get('/:id/reports', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, user } = req;
        const { startDate, endDate, reportType = 'sales' } = req.query;

        const organization = await Organization.findById(id);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get all stores in organization
        const stores = await Store.find({ organizationId: id, isActive: true });
        const storeIds = stores.map(s => s._id);

        // Parse date range
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
        const end = endDate ? new Date(endDate) : new Date();

        let reportData = {};

        if (reportType === 'sales') {
            // Sales report by store
            const salesByStore = await Sale.aggregate([
                {
                    $match: {
                        storeId: { $in: storeIds },
                        createdAt: { $gte: start, $lte: end },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: '$storeId',
                        revenue: { $sum: '$total' },
                        transactions: { $sum: 1 },
                        avgTransaction: { $avg: '$total' }
                    }
                },
                { $sort: { revenue: -1 } }
            ]);

            // Populate store names
            reportData.salesByStore = await Promise.all(
                salesByStore.map(async (item) => {
                    const store = await Store.findById(item._id);
                    return {
                        storeId: item._id,
                        storeName: store?.name || 'Unknown',
                        revenue: item.revenue,
                        transactions: item.transactions,
                        avgTransaction: item.avgTransaction
                    };
                })
            );

            // Daily sales trend
            reportData.dailyTrend = await Sale.aggregate([
                {
                    $match: {
                        storeId: { $in: storeIds },
                        createdAt: { $gte: start, $lte: end },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        revenue: { $sum: '$total' },
                        transactions: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

        } else if (reportType === 'inventory') {
            // Inventory report by store
            reportData.inventoryByStore = await Promise.all(
                stores.map(async (store) => {
                    const [totalProducts, lowStock, outOfStock, totalValue] = await Promise.all([
                        Product.countDocuments({ storeId: store._id, isActive: true }),
                        Product.countDocuments({
                            storeId: store._id,
                            isActive: true,
                            $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
                        }),
                        Product.countDocuments({ storeId: store._id, isActive: true, quantity: 0 }),
                        Product.aggregate([
                            { $match: { storeId: store._id, isActive: true } },
                            {
                                $group: {
                                    _id: null,
                                    totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } }
                                }
                            }
                        ])
                    ]);

                    return {
                        storeId: store._id,
                        storeName: store.name,
                        totalProducts,
                        lowStock,
                        outOfStock,
                        totalValue: totalValue[0]?.totalValue || 0
                    };
                })
            );

        } else if (reportType === 'customers') {
            // Customer report by store
            reportData.customersByStore = await Promise.all(
                stores.map(async (store) => {
                    const [totalCustomers, newCustomers] = await Promise.all([
                        Customer.countDocuments({ storeId: store._id }),
                        Customer.countDocuments({
                            storeId: store._id,
                            createdAt: { $gte: start, $lte: end }
                        })
                    ]);

                    // Get top customers
                    const topCustomers = await Sale.aggregate([
                        {
                            $match: {
                                storeId: store._id,
                                createdAt: { $gte: start, $lte: end },
                                status: 'completed',
                                customerId: { $ne: null }
                            }
                        },
                        {
                            $group: {
                                _id: '$customerId',
                                totalSpent: { $sum: '$total' },
                                visits: { $sum: 1 }
                            }
                        },
                        { $sort: { totalSpent: -1 } },
                        { $limit: 10 }
                    ]);

                    return {
                        storeId: store._id,
                        storeName: store.name,
                        totalCustomers,
                        newCustomers,
                        topCustomersCount: topCustomers.length
                    };
                })
            );
        }

        res.json({
            organizationId: id,
            organizationName: organization.name,
            reportType,
            dateRange: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            storeCount: stores.length,
            ...reportData
        });

    } catch (error) {
        console.error('Get organization reports error:', error);
        res.status(500).json({ error: 'Failed to generate consolidated report' });
    }
});

// ============================================
// STORE GROUP ROUTES
// ============================================

/**
 * GET /api/organizations/:orgId/groups
 * Get all store groups for an organization
 */
router.get('/:orgId/groups', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { userId, user } = req;

        const organization = await Organization.findById(orgId);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const groups = await StoreGroup.find({ organizationId: orgId, isActive: true })
            .populate('managerId', 'name email')
            .populate('parentGroupId', 'name')
            .sort({ name: 1 });

        // Get store count for each group
        const groupsWithCounts = await Promise.all(
            groups.map(async (group) => {
                const storeCount = await Store.countDocuments({ groupId: group._id });
                return {
                    ...group.toObject(),
                    storeCount
                };
            })
        );

        res.json(groupsWithCounts);
    } catch (error) {
        console.error('Get store groups error:', error);
        res.status(500).json({ error: 'Failed to fetch store groups' });
    }
});

/**
 * POST /api/organizations/:orgId/groups
 * Create new store group
 */
router.post('/:orgId/groups', async (req, res) => {
    try {
        const { orgId } = req.params;
        const { userId, user } = req;
        const { name, description, type, managerId, parentGroupId, settings, metadata } = req.body;

        const organization = await Organization.findById(orgId);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        const group = await StoreGroup.create({
            organizationId: orgId,
            name,
            description,
            type,
            managerId,
            parentGroupId,
            settings,
            metadata
        });

        await group.populate('managerId', 'name email');
        await group.populate('parentGroupId', 'name');

        res.status(201).json(group);
    } catch (error) {
        console.error('Create store group error:', error);
        res.status(500).json({ error: 'Failed to create store group' });
    }
});

/**
 * PUT /api/organizations/:orgId/groups/:groupId
 * Update store group
 */
router.put('/:orgId/groups/:groupId', async (req, res) => {
    try {
        const { orgId, groupId } = req.params;
        const { userId, user } = req;
        const updates = req.body;

        const organization = await Organization.findById(orgId);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const group = await StoreGroup.findOne({ _id: groupId, organizationId: orgId });

        if (!group) {
            return res.status(404).json({ error: 'Store group not found' });
        }

        // Don't allow changing organizationId
        delete updates.organizationId;

        Object.assign(group, updates);
        await group.save();

        await group.populate('managerId', 'name email');
        await group.populate('parentGroupId', 'name');

        res.json(group);
    } catch (error) {
        console.error('Update store group error:', error);
        res.status(500).json({ error: 'Failed to update store group' });
    }
});

/**
 * DELETE /api/organizations/:orgId/groups/:groupId
 * Delete store group
 */
router.delete('/:orgId/groups/:groupId', async (req, res) => {
    try {
        const { orgId, groupId } = req.params;
        const { userId, user } = req;

        const organization = await Organization.findById(orgId);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Check access
        if (user.role !== 'super_admin' && organization.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const group = await StoreGroup.findOne({ _id: groupId, organizationId: orgId });

        if (!group) {
            return res.status(404).json({ error: 'Store group not found' });
        }

        // Check if there are stores in this group
        const storeCount = await Store.countDocuments({ groupId: groupId });

        if (storeCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete group with stores. Please move or delete stores first.'
            });
        }

        // Soft delete
        group.isActive = false;
        await group.save();

        res.json({ message: 'Store group deleted successfully' });
    } catch (error) {
        console.error('Delete store group error:', error);
        res.status(500).json({ error: 'Failed to delete store group' });
    }
});

export default router;
