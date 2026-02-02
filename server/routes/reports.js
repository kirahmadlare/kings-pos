/**
 * @fileoverview Reports Routes
 *
 * API endpoints for custom report builder and scheduled reports
 */

import express from 'express';
import { Report, Sale, Product, Customer } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/reports
 * Get all reports for the user
 */
router.get('/', async (req, res) => {
    try {
        const { userId, storeId } = req;
        const { type, favorite } = req.query;

        const query = {
            $or: [
                { userId },
                { isPublic: true }
            ],
            isActive: true
        };

        if (type) query.reportType = type;
        if (favorite === 'true') query.isFavorite = true;
        if (storeId) query.storeId = storeId;

        const reports = await Report.find(query)
            .populate('userId', 'name email')
            .sort({ isFavorite: -1, lastRunAt: -1, createdAt: -1 });

        res.json(reports);
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

/**
 * GET /api/reports/:id
 * Get report by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;

        const report = await Report.findOne({
            _id: id,
            $or: [{ userId }, { isPublic: true }],
            isActive: true
        }).populate('userId', 'name email');

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json(report);
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

/**
 * POST /api/reports
 * Create a new report
 */
router.post('/', async (req, res) => {
    try {
        const { userId, storeId } = req;
        const reportData = req.body;

        const report = await Report.create({
            ...reportData,
            userId,
            storeId
        });

        res.status(201).json(report);
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to create report' });
    }
});

/**
 * PUT /api/reports/:id
 * Update a report
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;
        const updates = req.body;

        const report = await Report.findOne({
            _id: id,
            userId,
            isActive: true
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        Object.assign(report, updates);
        await report.save();

        res.json(report);
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ error: 'Failed to update report' });
    }
});

/**
 * DELETE /api/reports/:id
 * Delete a report (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;

        const report = await Report.findOne({
            _id: id,
            userId,
            isActive: true
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        report.isActive = false;
        await report.save();

        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

/**
 * POST /api/reports/:id/run
 * Execute a report
 */
router.post('/:id/run', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, storeId } = req;

        const report = await Report.findOne({
            _id: id,
            $or: [{ userId }, { isPublic: true }],
            isActive: true
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Execute report based on configuration
        const result = await executeReport(report, storeId);

        // Update run stats
        report.updateRunStats();
        await report.save();

        res.json({
            report: {
                id: report._id,
                name: report.name,
                reportType: report.reportType
            },
            data: result,
            executedAt: new Date()
        });
    } catch (error) {
        console.error('Run report error:', error);
        res.status(500).json({ error: 'Failed to execute report' });
    }
});

/**
 * POST /api/reports/:id/favorite
 * Toggle report favorite status
 */
router.post('/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;

        const report = await Report.findOne({
            _id: id,
            userId,
            isActive: true
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        report.isFavorite = !report.isFavorite;
        await report.save();

        res.json(report);
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

/**
 * GET /api/reports/scheduled/upcoming
 * Get upcoming scheduled reports
 */
router.get('/scheduled/upcoming', async (req, res) => {
    try {
        const { userId } = req;

        const scheduledReports = await Report.find({
            userId,
            'schedule.enabled': true,
            isActive: true
        }).sort({ 'schedule.nextRun': 1 });

        res.json(scheduledReports);
    } catch (error) {
        console.error('Get scheduled reports error:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled reports' });
    }
});

/**
 * Execute a report based on its configuration
 */
async function executeReport(report, storeId) {
    const { config } = report;
    const filters = config.filters || {};

    // Build date range
    let startDate, endDate;
    if (filters.dateRange) {
        if (filters.dateRange.type === 'custom') {
            startDate = new Date(filters.dateRange.startDate);
            endDate = new Date(filters.dateRange.endDate);
        } else {
            const now = new Date();
            switch (filters.dateRange.type) {
                case 'today':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    endDate = new Date();
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    endDate = new Date();
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date();
                    break;
                case 'quarter':
                    startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                    endDate = new Date();
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date();
                    break;
            }
        }
    }

    // Execute based on report type
    if (report.reportType === 'sales') {
        return await executeSalesReport(storeId, startDate, endDate, config);
    } else if (report.reportType === 'inventory') {
        return await executeInventoryReport(storeId, config);
    } else if (report.reportType === 'customers') {
        return await executeCustomersReport(storeId, startDate, endDate, config);
    }

    return { data: [] };
}

async function executeSalesReport(storeId, startDate, endDate, config) {
    const match = {
        storeId,
        status: 'completed'
    };

    if (startDate && endDate) {
        match.createdAt = { $gte: startDate, $lte: endDate };
    }

    const salesData = await Sale.aggregate([
        { $match: match },
        {
            $group: {
                _id: config.groupBy ? `$${config.groupBy}` : null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 },
                avgTransaction: { $avg: '$total' }
            }
        },
        { $sort: { totalRevenue: -1 } }
    ]);

    return salesData;
}

async function executeInventoryReport(storeId, config) {
    const products = await Product.find({ storeId, isActive: true });

    const data = products.map(p => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        value: p.quantity * p.costPrice,
        lowStock: p.quantity <= (p.lowStockThreshold || 5)
    }));

    return data;
}

async function executeCustomersReport(storeId, startDate, endDate, config) {
    const customers = await Customer.find({ storeId });

    const enrichedCustomers = await Promise.all(
        customers.map(async (customer) => {
            const salesMatch = { storeId, customerId: customer._id, status: 'completed' };
            if (startDate && endDate) {
                salesMatch.createdAt = { $gte: startDate, $lte: endDate };
            }

            const salesData = await Sale.aggregate([
                { $match: salesMatch },
                {
                    $group: {
                        _id: null,
                        totalSpent: { $sum: '$total' },
                        visits: { $sum: 1 }
                    }
                }
            ]);

            return {
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                totalSpent: salesData[0]?.totalSpent || 0,
                visits: salesData[0]?.visits || 0
            };
        })
    );

    return enrichedCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
}

export default router;
