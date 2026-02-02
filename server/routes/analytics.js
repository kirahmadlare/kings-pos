/**
 * @fileoverview Analytics Routes
 *
 * API endpoints for business analytics and reporting
 */

import express from 'express';
import { Sale, Product, Customer, Employee } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { TTL } from '../services/cacheService.js';
import {
    calculateInventoryTurnover,
    performRFMAnalysis,
    calculateEmployeePerformance,
    forecastSalesTrend
} from '../services/analyticsService.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/analytics/dashboard
 * Main dashboard metrics and KPIs
 */
router.get('/dashboard', cacheMiddleware({ namespace: 'analytics', ttl: TTL.SHORT }), async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(monthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

        // Today's sales
        const todaySales = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: todayStart },
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
        ]);

        // Yesterday's sales for comparison
        const yesterdaySales = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: yesterdayStart, $lt: todayStart },
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
        ]);

        // This week's sales
        const weekSales = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: weekStart },
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
        ]);

        // This month's sales
        const monthSales = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: monthStart },
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
        ]);

        // Last month's sales for comparison
        const lastMonthSales = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: lastMonthStart, $lt: monthStart },
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
        ]);

        // Product stats
        const productStats = await Product.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    lowStock: {
                        $sum: {
                            $cond: [{ $lte: ['$quantity', '$lowStockThreshold'] }, 1, 0]
                        }
                    },
                    outOfStock: {
                        $sum: {
                            $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Customer stats
        const customerStats = await Customer.aggregate([
            {
                $match: { storeId: req.storeId }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    newThisMonth: {
                        $sum: {
                            $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            sales: {
                today: {
                    revenue: todaySales[0]?.total || 0,
                    transactions: todaySales[0]?.count || 0,
                    change: calculateChange(
                        todaySales[0]?.total || 0,
                        yesterdaySales[0]?.total || 0
                    )
                },
                week: {
                    revenue: weekSales[0]?.total || 0,
                    transactions: weekSales[0]?.count || 0
                },
                month: {
                    revenue: monthSales[0]?.total || 0,
                    transactions: monthSales[0]?.count || 0,
                    change: calculateChange(
                        monthSales[0]?.total || 0,
                        lastMonthSales[0]?.total || 0
                    )
                }
            },
            products: productStats[0] || { total: 0, lowStock: 0, outOfStock: 0 },
            customers: customerStats[0] || { total: 0, newThisMonth: 0 }
        });
    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({ error: 'Failed to get dashboard analytics' });
    }
});

/**
 * GET /api/analytics/sales/trends
 * Sales trends over time
 */
router.get('/sales/trends', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { period = 'week', startDate, endDate } = req.query;

        let start, groupBy;

        if (startDate && endDate) {
            start = new Date(startDate);
        } else {
            // Default periods
            start = new Date();
            switch (period) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    groupBy = { $hour: '$createdAt' };
                    break;
                case 'week':
                    start.setDate(start.getDate() - 7);
                    groupBy = { $dayOfWeek: '$createdAt' };
                    break;
                case 'month':
                    start.setDate(start.getDate() - 30);
                    groupBy = { $dayOfMonth: '$createdAt' };
                    break;
                case 'year':
                    start.setMonth(start.getMonth() - 12);
                    groupBy = { $month: '$createdAt' };
                    break;
                default:
                    start.setDate(start.getDate() - 7);
                    groupBy = { $dayOfWeek: '$createdAt' };
            }
        }

        const trends = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: start },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    revenue: { $sum: '$total' },
                    transactions: { $sum: 1 },
                    avgTransaction: { $avg: '$total' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        res.json(trends);
    } catch (error) {
        console.error('Sales trends error:', error);
        res.status(500).json({ error: 'Failed to get sales trends' });
    }
});

/**
 * GET /api/analytics/products/top
 * Top selling products
 */
router.get('/products/top', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { limit = 10, period = 'month' } = req.query;

        let startDate = new Date();
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }

        const topProducts = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    transactions: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    productId: '$_id',
                    name: '$product.name',
                    totalSold: 1,
                    revenue: 1,
                    transactions: 1
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.json(topProducts);
    } catch (error) {
        console.error('Top products error:', error);
        res.status(500).json({ error: 'Failed to get top products' });
    }
});

/**
 * GET /api/analytics/categories/breakdown
 * Revenue breakdown by category
 */
router.get('/categories/breakdown', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let startDate = new Date();
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(startDate.getDate() - 30);
                break;
        }

        const categoryBreakdown = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $group: {
                    _id: {
                        categoryId: '$product.categoryId',
                        categoryName: { $arrayElemAt: ['$category.name', 0] }
                    },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    itemsSold: { $sum: '$items.quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: { $ifNull: ['$_id.categoryName', 'Uncategorized'] },
                    revenue: 1,
                    itemsSold: 1
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        res.json(categoryBreakdown);
    } catch (error) {
        console.error('Category breakdown error:', error);
        res.status(500).json({ error: 'Failed to get category breakdown' });
    }
});

/**
 * GET /api/analytics/customers/top
 * Top customers by spending
 */
router.get('/customers/top', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const topCustomers = await Customer.find({ storeId: req.storeId })
            .sort({ totalSpent: -1 })
            .limit(parseInt(limit))
            .select('name phone email totalSpent totalOrders lastOrderDate');

        res.json(topCustomers);
    } catch (error) {
        console.error('Top customers error:', error);
        res.status(500).json({ error: 'Failed to get top customers' });
    }
});

/**
 * GET /api/analytics/sales/hourly
 * Hourly sales breakdown for today
 */
router.get('/sales/hourly', cacheMiddleware({ namespace: 'analytics', ttl: TTL.SHORT }), async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const hourlySales = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: todayStart },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    revenue: { $sum: '$total' },
                    transactions: { $sum: 1 },
                    avgTransaction: { $avg: '$total' }
                }
            },
            {
                $sort: { '_id': 1 }
            },
            {
                $project: {
                    _id: 0,
                    hour: '$_id',
                    revenue: { $round: ['$revenue', 2] },
                    transactions: 1,
                    avgTransaction: { $round: ['$avgTransaction', 2] }
                }
            }
        ]);

        // Fill in missing hours with zero values
        const fullDayData = Array.from({ length: 24 }, (_, i) => {
            const hourData = hourlySales.find(h => h.hour === i);
            return hourData || { hour: i, revenue: 0, transactions: 0, avgTransaction: 0 };
        });

        res.json(fullDayData);
    } catch (error) {
        console.error('Hourly sales error:', error);
        res.status(500).json({ error: 'Failed to get hourly sales' });
    }
});

/**
 * GET /api/analytics/employees/performance
 * Employee performance comparison
 */
router.get('/employees/performance', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let startDate = new Date();
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(startDate.getDate() - 30);
                break;
        }

        const employeePerformance = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$employeeId',
                    totalSales: { $sum: '$total' },
                    transactions: { $sum: 1 },
                    avgTransaction: { $avg: '$total' }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    employeeId: '$_id',
                    employeeName: {
                        $ifNull: [
                            { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
                            'Unknown'
                        ]
                    },
                    totalSales: { $round: ['$totalSales', 2] },
                    transactions: 1,
                    avgTransaction: { $round: ['$avgTransaction', 2] }
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        res.json(employeePerformance);
    } catch (error) {
        console.error('Employee performance error:', error);
        res.status(500).json({ error: 'Failed to get employee performance' });
    }
});

/**
 * GET /api/analytics/payments/breakdown
 * Payment method breakdown
 */
router.get('/payments/breakdown', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let startDate = new Date();
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(startDate.getDate() - 30);
                break;
        }

        const paymentBreakdown = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    revenue: { $sum: '$total' },
                    transactions: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    method: { $ifNull: ['$_id', 'Cash'] },
                    revenue: { $round: ['$revenue', 2] },
                    transactions: 1
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        res.json(paymentBreakdown);
    } catch (error) {
        console.error('Payment breakdown error:', error);
        res.status(500).json({ error: 'Failed to get payment breakdown' });
    }
});

/**
 * GET /api/analytics/inventory/status
 * Inventory overview and status
 */
router.get('/inventory/status', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const inventoryStatus = await Product.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    isActive: true
                }
            },
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                totalProducts: { $sum: 1 },
                                totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
                                lowStock: {
                                    $sum: {
                                        $cond: [
                                            { $and: [
                                                { $lte: ['$quantity', '$lowStockThreshold'] },
                                                { $gt: ['$quantity', 0] }
                                            ]},
                                            1,
                                            0
                                        ]
                                    }
                                },
                                outOfStock: {
                                    $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
                                },
                                overStock: {
                                    $sum: {
                                        $cond: [{ $gte: ['$quantity', { $multiply: ['$lowStockThreshold', 5] }] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ],
                    byCategory: [
                        {
                            $lookup: {
                                from: 'categories',
                                localField: 'categoryId',
                                foreignField: '_id',
                                as: 'category'
                            }
                        },
                        {
                            $group: {
                                _id: '$categoryId',
                                categoryName: { $first: { $arrayElemAt: ['$category.name', 0] } },
                                products: { $sum: 1 },
                                totalQuantity: { $sum: '$quantity' },
                                totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                category: { $ifNull: ['$categoryName', 'Uncategorized'] },
                                products: 1,
                                totalQuantity: 1,
                                totalValue: { $round: ['$totalValue', 2] }
                            }
                        },
                        { $sort: { totalValue: -1 } }
                    ]
                }
            }
        ]);

        res.json({
            overview: inventoryStatus[0]?.overview[0] || {},
            byCategory: inventoryStatus[0]?.byCategory || []
        });
    } catch (error) {
        console.error('Inventory status error:', error);
        res.status(500).json({ error: 'Failed to get inventory status' });
    }
});

/**
 * GET /api/analytics/inventory-turnover
 * Calculate inventory turnover metrics
 */
router.get('/inventory-turnover', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const turnoverData = await calculateInventoryTurnover(req.storeId, start, end);

        res.json(turnoverData);
    } catch (error) {
        console.error('Inventory turnover analytics error:', error);
        res.status(500).json({ error: 'Failed to calculate inventory turnover' });
    }
});

/**
 * GET /api/analytics/customer-segments
 * Perform RFM customer segmentation
 */
router.get('/customer-segments', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const rfmData = await performRFMAnalysis(req.storeId);

        res.json(rfmData);
    } catch (error) {
        console.error('Customer segmentation error:', error);
        res.status(500).json({ error: 'Failed to perform customer segmentation' });
    }
});

/**
 * GET /api/analytics/employee-performance
 * Calculate employee performance metrics
 */
router.get('/employee-performance', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const performanceData = await calculateEmployeePerformance(req.storeId, start, end);

        // Populate employee names
        const enrichedData = await Promise.all(
            performanceData.employees.map(async (emp) => {
                const employee = await Employee.findById(emp.employeeId);
                return {
                    ...emp,
                    employeeName: employee?.name || 'Unknown',
                    role: employee?.role || 'N/A'
                };
            })
        );

        res.json({
            ...performanceData,
            employees: enrichedData
        });
    } catch (error) {
        console.error('Employee performance analytics error:', error);
        res.status(500).json({ error: 'Failed to calculate employee performance' });
    }
});

/**
 * GET /api/analytics/sales-forecast
 * Generate sales forecast using historical data
 */
router.get('/sales-forecast', cacheMiddleware({ namespace: 'analytics', ttl: TTL.MEDIUM }), async (req, res) => {
    try {
        const { days = 30, forecastPeriods = 7 } = req.query;

        // Get historical sales data
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const salesData = await Sale.aggregate([
            {
                $match: {
                    storeId: req.storeId,
                    createdAt: { $gte: startDate, $lte: endDate },
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

        // Generate forecast
        const forecast = forecastSalesTrend(salesData, parseInt(forecastPeriods));

        res.json({
            historical: salesData,
            forecast,
            parameters: {
                historicalDays: days,
                forecastPeriods
            }
        });
    } catch (error) {
        console.error('Sales forecast error:', error);
        res.status(500).json({ error: 'Failed to generate sales forecast' });
    }
});

/**
 * Helper function to calculate percentage change
 */
function calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

export default router;
