/**
 * @fileoverview Advanced Inventory Service
 *
 * Handles inventory forecasting, alerts, reorder point calculations, and ABC analysis
 */

import { Sale, Product } from '../models/index.js';

/**
 * Simple linear regression for sales forecasting
 */
function linearRegression(dataPoints) {
    const n = dataPoints.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    dataPoints.forEach((point, index) => {
        const x = index;
        const y = point;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

/**
 * Forecast future demand for a product
 */
export async function forecastDemand(productId, storeId, daysAhead = 30) {
    try {
        // Get sales data for the last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const salesData = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    createdAt: { $gte: ninetyDaysAgo },
                    status: 'completed'
                }
            },
            { $unwind: '$items' },
            {
                $match: { 'items.productId': productId }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    quantitySold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        if (salesData.length < 7) {
            return {
                forecast: 0,
                confidence: 'low',
                message: 'Insufficient sales history for accurate forecasting'
            };
        }

        // Extract daily quantities
        const dailyQuantities = salesData.map(d => d.quantitySold);

        // Perform linear regression
        const { slope, intercept } = linearRegression(dailyQuantities);

        // Calculate forecast
        const forecastDays = [];
        for (let i = 0; i < daysAhead; i++) {
            const x = dailyQuantities.length + i;
            const predicted = Math.max(0, slope * x + intercept);
            forecastDays.push(Math.round(predicted));
        }

        const totalForecast = forecastDays.reduce((sum, qty) => sum + qty, 0);
        const avgDailySales = dailyQuantities.reduce((sum, qty) => sum + qty, 0) / dailyQuantities.length;

        // Determine confidence based on data consistency
        const variance = dailyQuantities.reduce((sum, qty) => sum + Math.pow(qty - avgDailySales, 2), 0) / dailyQuantities.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = (stdDev / avgDailySales) * 100;

        let confidence = 'high';
        if (coefficientOfVariation > 50) confidence = 'low';
        else if (coefficientOfVariation > 30) confidence = 'medium';

        return {
            forecast: totalForecast,
            dailyAverage: Math.round(avgDailySales * 10) / 10,
            trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
            confidence,
            forecastDays,
            historicalData: {
                days: salesData.length,
                totalSold: dailyQuantities.reduce((sum, qty) => sum + qty, 0),
                avgDailySales: Math.round(avgDailySales * 10) / 10
            }
        };
    } catch (error) {
        console.error('Demand forecasting error:', error);
        throw new Error('Failed to forecast demand');
    }
}

/**
 * Calculate reorder point (ROP) for a product
 * ROP = (Average Daily Sales × Lead Time) + Safety Stock
 */
export async function calculateReorderPoint(productId, storeId, leadTimeDays = 7) {
    try {
        const forecast = await forecastDemand(productId, storeId, leadTimeDays);

        // Safety stock = z-score × std dev × sqrt(lead time)
        // Using z-score of 1.65 for 95% service level
        const safetyStock = Math.ceil(forecast.dailyAverage * Math.sqrt(leadTimeDays) * 1.65);

        const reorderPoint = Math.ceil((forecast.dailyAverage * leadTimeDays) + safetyStock);
        const economicOrderQuantity = Math.ceil(forecast.dailyAverage * leadTimeDays * 2); // Simple EOQ

        return {
            reorderPoint,
            safetyStock,
            economicOrderQuantity,
            leadTimeDays,
            avgDailySales: forecast.dailyAverage
        };
    } catch (error) {
        console.error('ROP calculation error:', error);
        throw new Error('Failed to calculate reorder point');
    }
}

/**
 * Perform ABC analysis on inventory
 * A items: 80% of value (top 20% of items)
 * B items: 15% of value (next 30% of items)
 * C items: 5% of value (remaining 50% of items)
 */
export async function performABCAnalysis(storeId) {
    try {
        // Get all products with their value
        const products = await Product.find({
            storeId,
            isActive: true
        }).lean();

        // Calculate total value for each product
        const productsWithValue = products.map(p => ({
            ...p,
            totalValue: p.quantity * p.costPrice,
            annualRevenue: 0 // Will be populated from sales data
        }));

        // Get annual sales data for revenue calculation
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const salesData = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    createdAt: { $gte: oneYearAgo },
                    status: 'completed'
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    annualRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    annualQuantity: { $sum: '$items.quantity' }
                }
            }
        ]);

        // Merge sales data
        const salesMap = new Map(salesData.map(s => [s._id.toString(), s]));
        productsWithValue.forEach(p => {
            const sales = salesMap.get(p._id.toString());
            if (sales) {
                p.annualRevenue = sales.annualRevenue;
                p.annualQuantity = sales.annualQuantity;
            }
        });

        // Sort by annual revenue (descending)
        productsWithValue.sort((a, b) => b.annualRevenue - a.annualRevenue);

        // Calculate cumulative percentages
        const totalRevenue = productsWithValue.reduce((sum, p) => sum + p.annualRevenue, 0);
        let cumulativeRevenue = 0;
        let cumulativePercentage = 0;

        const categorized = productsWithValue.map((p, index) => {
            cumulativeRevenue += p.annualRevenue;
            cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;

            let category = 'C';
            if (cumulativePercentage <= 80) category = 'A';
            else if (cumulativePercentage <= 95) category = 'B';

            return {
                productId: p._id,
                name: p.name,
                sku: p.sku,
                category,
                annualRevenue: p.annualRevenue,
                annualQuantity: p.annualQuantity,
                currentStock: p.quantity,
                totalValue: p.totalValue,
                revenuePercentage: (p.annualRevenue / totalRevenue) * 100,
                cumulativePercentage
            };
        });

        // Calculate summary
        const summary = {
            A: { count: 0, revenue: 0, percentage: 0 },
            B: { count: 0, revenue: 0, percentage: 0 },
            C: { count: 0, revenue: 0, percentage: 0 }
        };

        categorized.forEach(item => {
            summary[item.category].count++;
            summary[item.category].revenue += item.annualRevenue;
        });

        Object.keys(summary).forEach(cat => {
            summary[cat].percentage = (summary[cat].revenue / totalRevenue) * 100;
        });

        return {
            products: categorized,
            summary,
            totalProducts: categorized.length,
            totalRevenue
        };
    } catch (error) {
        console.error('ABC analysis error:', error);
        throw new Error('Failed to perform ABC analysis');
    }
}

/**
 * Identify slow-moving and dead stock
 */
export async function identifySlowMovers(storeId, daysSinceLastSale = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastSale);

        const products = await Product.find({
            storeId,
            isActive: true,
            quantity: { $gt: 0 }
        }).lean();

        const productIds = products.map(p => p._id);

        // Get last sale date for each product
        const lastSales = await Sale.aggregate([
            {
                $match: {
                    storeId,
                    status: 'completed'
                }
            },
            { $unwind: '$items' },
            {
                $match: { 'items.productId': { $in: productIds } }
            },
            {
                $group: {
                    _id: '$items.productId',
                    lastSaleDate: { $max: '$createdAt' },
                    totalSold: { $sum: '$items.quantity' }
                }
            }
        ]);

        const salesMap = new Map(lastSales.map(s => [s._id.toString(), s]));

        const slowMovers = products
            .map(p => {
                const sales = salesMap.get(p._id.toString());
                const lastSaleDate = sales?.lastSaleDate;
                const daysSinceLastSale = lastSaleDate
                    ? Math.floor((new Date() - new Date(lastSaleDate)) / (1000 * 60 * 60 * 24))
                    : 999;

                return {
                    productId: p._id,
                    name: p.name,
                    sku: p.sku,
                    quantity: p.quantity,
                    value: p.quantity * p.costPrice,
                    lastSaleDate,
                    daysSinceLastSale,
                    status: daysSinceLastSale > 180 ? 'dead' : daysSinceLastSale > 90 ? 'slow' : 'normal'
                };
            })
            .filter(p => p.daysSinceLastSale > daysSinceLastSale)
            .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);

        return {
            slowMovers,
            totalValue: slowMovers.reduce((sum, p) => sum + p.value, 0),
            deadStock: slowMovers.filter(p => p.status === 'dead'),
            slowStock: slowMovers.filter(p => p.status === 'slow')
        };
    } catch (error) {
        console.error('Slow movers identification error:', error);
        throw new Error('Failed to identify slow movers');
    }
}

/**
 * Calculate inventory turnover rate
 */
export async function calculateTurnoverRate(storeId, periodDays = 365) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Get total cost of goods sold (COGS)
        const cogs = await Sale.aggregate([
            {
                $match: {
                    storeId,
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

        // Get average inventory value
        const products = await Product.find({ storeId, isActive: true });
        const currentInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);

        const totalCOGS = cogs[0]?.totalCOGS || 0;
        const turnoverRate = currentInventoryValue > 0 ? totalCOGS / currentInventoryValue : 0;
        const daysInInventory = turnoverRate > 0 ? periodDays / turnoverRate : 0;

        return {
            turnoverRate: Math.round(turnoverRate * 100) / 100,
            daysInInventory: Math.round(daysInInventory),
            totalCOGS,
            avgInventoryValue: currentInventoryValue,
            period: `${periodDays} days`
        };
    } catch (error) {
        console.error('Turnover rate calculation error:', error);
        throw new Error('Failed to calculate turnover rate');
    }
}
