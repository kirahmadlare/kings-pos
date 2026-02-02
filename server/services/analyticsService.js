/**
 * @fileoverview Advanced Analytics Service
 *
 * Complex analytics calculations for business intelligence
 */

import { Sale, Product, Customer } from '../models/index.js';

/**
 * Calculate inventory turnover rate
 * Turnover Rate = Cost of Goods Sold / Average Inventory Value
 */
export const calculateInventoryTurnover = async (storeId, startDate, endDate) => {
    try {
        // Get sales for the period (Cost of Goods Sold)
        const salesData = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: 'completed'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $group: {
                    _id: null,
                    totalCOGS: {
                        $sum: {
                            $multiply: ['$items.quantity', '$product.costPrice']
                        }
                    }
                }
            }
        ]);

        const cogs = salesData[0]?.totalCOGS || 0;

        // Get average inventory value
        const products = await Product.find({ storeId, isActive: true });
        const currentInventoryValue = products.reduce((sum, p) => {
            return sum + (p.quantity * p.costPrice);
        }, 0);

        // Calculate turnover
        const turnoverRate = currentInventoryValue > 0 ? cogs / currentInventoryValue : 0;
        const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysInInventory = turnoverRate > 0 ? daysInPeriod / turnoverRate : 0;

        // Identify slow and fast moving products
        const productSales = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: 'completed'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { totalSold: -1 } }
        ]);

        const fastMoving = productSales.slice(0, 10);
        const slowMoving = productSales.slice(-10).reverse();

        // Populate product names
        const populateProduct = async (item) => {
            const product = await Product.findById(item._id);
            return {
                productId: item._id,
                productName: product?.name || 'Unknown',
                totalSold: item.totalSold,
                revenue: item.revenue
            };
        };

        return {
            turnoverRate: turnoverRate.toFixed(2),
            daysInInventory: daysInInventory.toFixed(1),
            cogs,
            avgInventoryValue: currentInventoryValue,
            fastMoving: await Promise.all(fastMoving.map(populateProduct)),
            slowMoving: await Promise.all(slowMoving.map(populateProduct))
        };

    } catch (error) {
        console.error('Calculate inventory turnover error:', error);
        throw error;
    }
};

/**
 * Perform RFM (Recency, Frequency, Monetary) customer segmentation
 */
export const performRFMAnalysis = async (storeId) => {
    try {
        const now = new Date();

        // Get customer sales data
        const customerData = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    status: 'completed',
                    customerId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$customerId',
                    lastPurchase: { $max: '$createdAt' },
                    frequency: { $sum: 1 },
                    monetary: { $sum: '$total' }
                }
            }
        ]);

        if (customerData.length === 0) {
            return { segments: [], totalCustomers: 0 };
        }

        // Calculate recency (days since last purchase)
        const enrichedData = customerData.map(c => ({
            ...c,
            recency: Math.floor((now - new Date(c.lastPurchase)) / (1000 * 60 * 60 * 24))
        }));

        // Calculate quartiles for scoring
        const recencies = enrichedData.map(c => c.recency).sort((a, b) => a - b);
        const frequencies = enrichedData.map(c => c.frequency).sort((a, b) => a - b);
        const monetaries = enrichedData.map(c => c.monetary).sort((a, b) => a - b);

        const getQuartile = (arr, value) => {
            const index = arr.indexOf(value);
            const quartile = Math.ceil((index + 1) / arr.length * 4);
            return 5 - quartile; // Invert for recency (lower is better)
        };

        // Score customers (1-4 for each dimension)
        const scoredCustomers = enrichedData.map(c => {
            const rScore = 5 - getQuartile(recencies, c.recency); // Lower recency = higher score
            const fScore = getQuartile(frequencies, c.frequency);
            const mScore = getQuartile(monetaries, c.monetary);

            let segment = 'Other';

            // Segment based on RFM scores
            if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
                segment = 'Champions';
            } else if (rScore >= 3 && fScore >= 3 && mScore >= 3) {
                segment = 'Loyal Customers';
            } else if (rScore >= 4 && fScore <= 2) {
                segment = 'New Customers';
            } else if (rScore <= 2 && fScore >= 3 && mScore >= 3) {
                segment = 'At Risk';
            } else if (rScore <= 2 && fScore <= 2) {
                segment = 'Lost';
            } else if (mScore >= 4) {
                segment = 'Big Spenders';
            }

            return {
                customerId: c._id,
                recency: c.recency,
                frequency: c.frequency,
                monetary: c.monetary,
                rScore,
                fScore,
                mScore,
                segment
            };
        });

        // Aggregate by segment
        const segments = {};
        scoredCustomers.forEach(c => {
            if (!segments[c.segment]) {
                segments[c.segment] = {
                    segment: c.segment,
                    count: 0,
                    avgRecency: 0,
                    avgFrequency: 0,
                    avgSpend: 0,
                    totalRevenue: 0
                };
            }
            segments[c.segment].count++;
            segments[c.segment].avgRecency += c.recency;
            segments[c.segment].avgFrequency += c.frequency;
            segments[c.segment].avgSpend += c.monetary;
            segments[c.segment].totalRevenue += c.monetary;
        });

        // Calculate averages
        Object.keys(segments).forEach(key => {
            const seg = segments[key];
            seg.avgRecency = (seg.avgRecency / seg.count).toFixed(1);
            seg.avgFrequency = (seg.avgFrequency / seg.count).toFixed(1);
            seg.avgSpend = (seg.avgSpend / seg.count).toFixed(2);
        });

        return {
            segments: Object.values(segments),
            totalCustomers: customerData.length,
            customers: scoredCustomers
        };

    } catch (error) {
        console.error('RFM analysis error:', error);
        throw error;
    }
};

/**
 * Calculate employee performance metrics
 */
export const calculateEmployeePerformance = async (storeId, startDate, endDate) => {
    try {
        const employeeStats = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: 'completed',
                    employeeId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$employeeId',
                    totalSales: { $sum: '$total' },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: '$total' },
                    totalItems: { $sum: { $size: '$items' } }
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        // Calculate performance rankings
        const totalRevenue = employeeStats.reduce((sum, e) => sum + e.totalSales, 0);

        const enrichedStats = employeeStats.map((emp, index) => ({
            employeeId: emp._id,
            rank: index + 1,
            totalSales: emp.totalSales,
            transactionCount: emp.transactionCount,
            avgTransaction: emp.avgTransaction,
            totalItems: emp.totalItems,
            avgItemsPerTransaction: (emp.totalItems / emp.transactionCount).toFixed(1),
            revenueShare: ((emp.totalSales / totalRevenue) * 100).toFixed(1)
        }));

        return {
            employees: enrichedStats,
            totalRevenue,
            avgTransactionValue: (totalRevenue / employeeStats.reduce((sum, e) => sum + e.transactionCount, 0)).toFixed(2)
        };

    } catch (error) {
        console.error('Calculate employee performance error:', error);
        throw error;
    }
};

/**
 * Generate sales trend forecast using simple linear regression
 */
export const forecastSalesTrend = (salesData, periodsAhead = 7) => {
    if (salesData.length < 2) {
        return [];
    }

    // Prepare data points
    const points = salesData.map((item, index) => ({
        x: index,
        y: item.revenue
    }));

    // Calculate linear regression
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + (p.x * p.y), 0);
    const sumX2 = points.reduce((sum, p) => sum + (p.x * p.x), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecast = [];
    for (let i = 0; i < periodsAhead; i++) {
        const x = n + i;
        const predictedValue = slope * x + intercept;
        forecast.push({
            period: x,
            predicted: Math.max(0, predictedValue), // Ensure non-negative
            confidence: 'medium' // Could calculate confidence intervals
        });
    }

    return forecast;
};
