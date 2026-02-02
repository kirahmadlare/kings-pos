/**
 * @fileoverview Export Routes
 *
 * API endpoints for exporting data to various formats
 */

import express from 'express';
import { Sale, Product, Customer } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import {
    exportToCSV,
    exportToExcel,
    exportToPDF,
    generateSalesReport,
    generateInventoryReport,
    generateCustomerReport
} from '../services/exportService.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/export/sales
 * Export sales data
 */
router.get('/sales', async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate, status } = req.query;

        // Build query
        const query = { storeId: req.storeId };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (status) query.status = status;

        // Fetch sales with customer info
        const sales = await Sale.find(query)
            .populate('customerId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean();

        // Add customer names
        sales.forEach(sale => {
            if (sale.customerId) {
                sale.customerName = `${sale.customerId.firstName} ${sale.customerId.lastName}`;
            }
        });

        // Generate report
        const dateRange = startDate && endDate
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : 'All Time';

        const data = await generateSalesReport(sales, format, { dateRange });

        // Set response headers
        const filename = `sales-report-${Date.now()}`;
        const contentTypes = {
            csv: 'text/csv',
            excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf'
        };
        const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extensions[format]}"`);

        res.send(data);
    } catch (error) {
        console.error('Sales export error:', error);
        res.status(500).json({ error: 'Failed to export sales data' });
    }
});

/**
 * GET /api/export/products
 * Export products/inventory data
 */
router.get('/products', async (req, res) => {
    try {
        const { format = 'csv', category, status } = req.query;

        // Build query
        const query = { storeId: req.storeId };

        if (category) query.categoryId = category;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;
        if (status === 'lowstock') {
            query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
        }
        if (status === 'outofstock') query.quantity = 0;

        // Fetch products with category info
        const products = await Product.find(query)
            .populate('categoryId', 'name')
            .sort({ name: 1 })
            .lean();

        // Add category names
        products.forEach(product => {
            if (product.categoryId) {
                product.category = product.categoryId;
            }
        });

        // Generate report
        const data = await generateInventoryReport(products, format);

        // Set response headers
        const filename = `inventory-report-${Date.now()}`;
        const contentTypes = {
            csv: 'text/csv',
            excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf'
        };
        const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extensions[format]}"`);

        res.send(data);
    } catch (error) {
        console.error('Products export error:', error);
        res.status(500).json({ error: 'Failed to export products data' });
    }
});

/**
 * GET /api/export/customers
 * Export customers data
 */
router.get('/customers', async (req, res) => {
    try {
        const { format = 'csv', hasLoyalty } = req.query;

        // Build query
        const query = { storeId: req.storeId };

        if (hasLoyalty === 'true') {
            query.loyaltyPoints = { $gt: 0 };
        }

        // Fetch customers
        const customers = await Customer.find(query)
            .sort({ totalSpent: -1 })
            .lean();

        // Generate report
        const data = await generateCustomerReport(customers, format);

        // Set response headers
        const filename = `customers-report-${Date.now()}`;
        const contentTypes = {
            csv: 'text/csv',
            excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf'
        };
        const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extensions[format]}"`);

        res.send(data);
    } catch (error) {
        console.error('Customers export error:', error);
        res.status(500).json({ error: 'Failed to export customers data' });
    }
});

/**
 * GET /api/export/inventory
 * Export full inventory report
 */
router.get('/inventory', async (req, res) => {
    try {
        const { format = 'pdf' } = req.query;

        // Fetch all active products with categories
        const products = await Product.find({
            storeId: req.storeId,
            isActive: true
        })
            .populate('categoryId', 'name')
            .sort({ 'categoryId.name': 1, name: 1 })
            .lean();

        // Add category names
        products.forEach(product => {
            if (product.categoryId) {
                product.category = product.categoryId;
            }
        });

        // Generate report
        const data = await generateInventoryReport(products, format);

        // Set response headers
        const filename = `full-inventory-${Date.now()}`;
        const contentTypes = {
            csv: 'text/csv',
            excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf'
        };
        const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extensions[format]}"`);

        res.send(data);
    } catch (error) {
        console.error('Inventory export error:', error);
        res.status(500).json({ error: 'Failed to export inventory data' });
    }
});

/**
 * POST /api/export/custom
 * Export custom data with specified columns
 */
router.post('/custom', async (req, res) => {
    try {
        const { data, columns, format = 'csv', title, subtitle } = req.body;

        if (!data || !columns) {
            return res.status(400).json({ error: 'Data and columns are required' });
        }

        let exportData;

        const options = { title, subtitle };

        switch (format) {
            case 'csv':
                exportData = await exportToCSV(data, columns);
                break;
            case 'excel':
                exportData = await exportToExcel(data, columns, { sheetName: title || 'Data' });
                break;
            case 'pdf':
                exportData = await exportToPDF(data, columns, options);
                break;
            default:
                return res.status(400).json({ error: 'Unsupported format' });
        }

        // Set response headers
        const filename = `export-${Date.now()}`;
        const contentTypes = {
            csv: 'text/csv',
            excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf'
        };
        const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extensions[format]}"`);

        res.send(exportData);
    } catch (error) {
        console.error('Custom export error:', error);
        res.status(500).json({ error: 'Failed to export custom data' });
    }
});

export default router;
