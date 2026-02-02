/**
 * @fileoverview Product Routes
 */

import express from 'express';
import multer from 'multer';
import { Product } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { socketHandlers } from '../socket/index.js';
import { hasConflict, getConflictResponse, incrementSyncVersion } from '../services/conflictResolver.js';
import { cacheProducts } from '../middleware/cache.js';
import { invalidateEntityCache } from '../services/cacheService.js';
import {
    parseExcelBuffer,
    dataToCSV,
    dataToExcel,
    validateImport,
    transformImportData
} from '../services/importExportService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError } from '../utils/errors.js';
import * as notificationService from '../services/notificationService.js';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

router.use(authenticate);

/**
 * GET /products
 */
router.get('/', cacheProducts, async (req, res) => {
    try {
        const { category, active, search } = req.query;

        const query = { storeId: req.storeId };

        if (category) {
            query.categoryId = category;
        }

        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        let products = Product.find(query).sort({ name: 1 });

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        const result = await products;

        // Debug logging
        console.log(`📦 GET /products returning ${result.length} products`);
        if (result.length > 0) {
            const appleProduct = result.find(p => p.name?.toLowerCase().includes('apple'));
            if (appleProduct) {
                console.log('📦 Apple product in response:', {
                    _id: appleProduct._id,
                    name: appleProduct.name,
                    quantity: appleProduct.quantity
                });
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

/**
 * GET /products/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

/**
 * POST /products
 */
router.post('/', async (req, res) => {
    try {
        // Handle categoryId - convert to null if it's not a valid ObjectId
        const productData = { ...req.body, storeId: req.storeId };

        // If categoryId is a number or not a valid ObjectId, set to null
        if (productData.categoryId && typeof productData.categoryId === 'number') {
            productData.categoryId = null;
        }

        const product = new Product(productData);

        await product.save();

        // Invalidate product cache
        await invalidateEntityCache('products', req.storeId);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            socketHandlers.products.broadcastProductCreated(io, req.storeId, product);
        }

        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

/**
 * PUT /products/:id
 */
router.put('/:id', async (req, res) => {
    try {
        // Get current product to check for conflicts
        const existingProduct = await Product.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check for conflict
        if (req.body.syncVersion && hasConflict(existingProduct, req.body.syncVersion)) {
            return res.status(409).json(getConflictResponse(existingProduct, req.body));
        }

        // Prepare updates - remove immutable fields
        const { storeId, _id, createdAt, serverId, ...updateData } = req.body;

        // Update with incremented sync version
        const updates = {
            ...updateData,
            syncVersion: existingProduct.syncVersion + 1,
            lastSyncedAt: new Date()
        };

        // Handle categoryId - convert to null if it's not a valid ObjectId
        if (updates.categoryId && typeof updates.categoryId === 'number') {
            updates.categoryId = null;
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, storeId: req.storeId },
            updates,
            { new: true }
        );

        // Invalidate product cache
        await invalidateEntityCache('products', req.storeId, req.params.id);

        // Check for low stock/out of stock and create notifications
        const io = req.app.get('io');
        if (product.quantity === 0) {
            // Out of stock
            const notification = await notificationService.createOutOfStockNotification(req.storeId, product);
            if (io) {
                notificationService.broadcastNotification(io, req.storeId, notification);
            }
        } else if (product.reorderLevel && product.quantity <= product.reorderLevel && product.quantity > 0) {
            // Low stock
            const notification = await notificationService.createLowStockNotification(req.storeId, product);
            if (io) {
                notificationService.broadcastNotification(io, req.storeId, notification);
            }
        }

        // Emit socket event for product update
        if (io) {
            socketHandlers.products.broadcastProductUpdated(io, req.storeId, product);
        }

        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

/**
 * DELETE /products/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Invalidate product cache
        await invalidateEntityCache('products', req.storeId, req.params.id);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            socketHandlers.products.broadcastProductDeleted(io, req.storeId, req.params.id);
        }

        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

/**
 * PATCH /products/:id/stock
 * Update product stock quantity
 */
router.patch('/:id/stock', async (req, res) => {
    try {
        const { quantity, adjustment } = req.body;

        const product = await Product.findOne({
            _id: req.params.id,
            storeId: req.storeId
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (quantity !== undefined) {
            product.quantity = Math.max(0, quantity);
        } else if (adjustment !== undefined) {
            product.quantity = Math.max(0, product.quantity + adjustment);
        }

        await product.save();

        // Check for low stock/out of stock and create notifications
        const io = req.app.get('io');
        if (product.quantity === 0) {
            // Out of stock
            const notification = await notificationService.createOutOfStockNotification(req.storeId, product);
            if (io) {
                notificationService.broadcastNotification(io, req.storeId, notification);
            }
        } else if (product.reorderLevel && product.quantity <= product.reorderLevel && product.quantity > 0) {
            // Low stock
            const notification = await notificationService.createLowStockNotification(req.storeId, product);
            if (io) {
                notificationService.broadcastNotification(io, req.storeId, notification);
            }
        }

        // Emit socket event for stock update
        if (io) {
            socketHandlers.products.broadcastProductStockUpdated(io, req.storeId, product._id, product.quantity);
        }

        res.json(product);
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// ==================== BULK OPERATIONS ====================

/**
 * POST /products/bulk
 * Bulk create or update products
 */
router.post('/bulk', asyncHandler(async (req, res) => {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
        throw new ValidationError('operations array is required');
    }

    const results = {
        created: [],
        updated: [],
        errors: []
    };

    for (let i = 0; i < operations.length; i++) {
        const op = operations[i];

        try {
            if (op.action === 'create') {
                const product = await Product.create({
                    ...op.data,
                    storeId: req.storeId,
                    syncVersion: 1
                });

                results.created.push(product);

                // Emit socket event
                const io = req.app.get('io');
                if (io) {
                    socketHandlers.products.broadcastProductCreated(io, req.storeId, product);
                }
            } else if (op.action === 'update') {
                if (!op.id) {
                    throw new Error('Product ID required for update');
                }

                const product = await Product.findOne({ _id: op.id, storeId: req.storeId });
                if (!product) {
                    throw new Error('Product not found');
                }

                Object.assign(product, op.data);
                incrementSyncVersion(product);
                await product.save();

                results.updated.push(product);

                // Emit socket event
                const io = req.app.get('io');
                if (io) {
                    socketHandlers.products.broadcastProductUpdated(io, req.storeId, product);
                }
            }
        } catch (error) {
            results.errors.push({
                index: i,
                operation: op.action,
                error: error.message
            });
        }
    }

    // Invalidate cache
    await invalidateEntityCache('products', req.storeId);

    res.json(results);
}));

/**
 * DELETE /products/bulk
 * Bulk delete products
 */
router.delete('/bulk', asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new ValidationError('ids array is required');
    }

    const results = {
        deleted: [],
        errors: []
    };

    for (const id of ids) {
        try {
            const product = await Product.findOne({ _id: id, storeId: req.storeId });

            if (!product) {
                throw new Error('Product not found');
            }

            await product.deleteOne();
            results.deleted.push(id);

            // Emit socket event
            const io = req.app.get('io');
            if (io) {
                socketHandlers.products.broadcastProductDeleted(io, req.storeId, id);
            }
        } catch (error) {
            results.errors.push({
                id,
                error: error.message
            });
        }
    }

    // Invalidate cache
    await invalidateEntityCache('products', req.storeId);

    res.json(results);
}));

// ==================== IMPORT/EXPORT ====================

/**
 * POST /products/import
 * Import products from CSV/Excel
 */
router.post('/import', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ValidationError('File is required');
    }

    const { mimetype, buffer } = req.file;

    // Parse file based on type
    let data;
    if (mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel') {
        // For CSV, we need to convert buffer to array
        const text = buffer.toString('utf-8');
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        const headers = rows[0].split(',');

        data = rows.slice(1).map(row => {
            const values = row.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = values[index]?.trim() || '';
            });
            return obj;
        });
    } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel'
    ) {
        data = parseExcelBuffer(buffer);
    } else {
        throw new ValidationError('File must be CSV or Excel format');
    }

    // Define validation schema
    const schema = {
        required: ['name', 'price', 'quantity'],
        fields: {
            name: { type: 'string' },
            price: { type: 'number', min: 0 },
            costPrice: { type: 'number', min: 0 },
            quantity: { type: 'number', min: 0 },
            sku: { type: 'string' },
            barcode: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            reorderLevel: { type: 'number', min: 0 },
            isActive: { enum: ['true', 'false', '1', '0', 'yes', 'no'] }
        }
    };

    // Validate data
    const validation = validateImport(data, schema);

    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            errors: validation.errors,
            validCount: validation.validCount,
            errorCount: validation.errorCount
        });
    }

    // Transform and import valid rows
    const results = {
        created: 0,
        updated: 0,
        errors: []
    };

    for (const row of validation.validRows) {
        try {
            // Convert boolean fields
            const isActive = row.isActive
                ? ['true', '1', 'yes'].includes(String(row.isActive).toLowerCase())
                : true;

            // Check if product exists by SKU or barcode
            let product = null;
            if (row.sku) {
                product = await Product.findOne({ storeId: req.storeId, sku: row.sku });
            } else if (row.barcode) {
                product = await Product.findOne({ storeId: req.storeId, barcode: row.barcode });
            }

            if (product) {
                // Update existing product
                product.name = row.name;
                product.price = parseFloat(row.price);
                product.costPrice = row.costPrice ? parseFloat(row.costPrice) : 0;
                product.quantity = parseInt(row.quantity) || 0;
                product.description = row.description || '';
                product.reorderLevel = row.reorderLevel ? parseInt(row.reorderLevel) : 0;
                product.isActive = isActive;

                incrementSyncVersion(product);
                await product.save();
                results.updated++;
            } else {
                // Create new product
                product = await Product.create({
                    storeId: req.storeId,
                    name: row.name,
                    price: parseFloat(row.price),
                    costPrice: row.costPrice ? parseFloat(row.costPrice) : 0,
                    quantity: parseInt(row.quantity) || 0,
                    sku: row.sku || '',
                    barcode: row.barcode || '',
                    description: row.description || '',
                    reorderLevel: row.reorderLevel ? parseInt(row.reorderLevel) : 0,
                    isActive,
                    syncVersion: 1
                });
                results.created++;
            }

            // Emit socket event
            const io = req.app.get('io');
            if (io) {
                if (results.updated > results.created) {
                    socketHandlers.products.broadcastProductUpdated(io, req.storeId, product);
                } else {
                    socketHandlers.products.broadcastProductCreated(io, req.storeId, product);
                }
            }
        } catch (error) {
            results.errors.push({
                row: row._rowNumber,
                error: error.message
            });
        }
    }

    // Invalidate cache
    await invalidateEntityCache('products', req.storeId);

    res.json({
        success: true,
        ...results,
        totalProcessed: validation.validRows.length
    });
}));

/**
 * GET /products/export
 * Export products to CSV or Excel
 */
router.get('/export', asyncHandler(async (req, res) => {
    const { format = 'csv' } = req.query;

    // Get all products for store
    const products = await Product.find({ storeId: req.storeId })
        .populate('categoryId', 'name')
        .sort({ name: 1 });

    // Define export columns
    const columns = [
        { key: 'name', header: 'Product Name' },
        { key: 'sku', header: 'SKU' },
        { key: 'barcode', header: 'Barcode' },
        { key: 'description', header: 'Description' },
        { key: 'price', header: 'Price' },
        { key: 'costPrice', header: 'Cost Price' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'reorderLevel', header: 'Reorder Level' },
        {
            key: 'category',
            header: 'Category',
            accessor: (product) => product.categoryId?.name || ''
        },
        {
            key: 'isActive',
            header: 'Active',
            accessor: (product) => product.isActive ? 'Yes' : 'No'
        },
        {
            key: 'createdAt',
            header: 'Created At',
            accessor: (product) => new Date(product.createdAt).toISOString().split('T')[0]
        }
    ];

    if (format === 'excel') {
        const buffer = dataToExcel(products, 'Products', columns);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.xlsx`);
        res.send(buffer);
    } else {
        const csv = dataToCSV(products, columns);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.csv`);
        res.send(csv);
    }
}));

export default router;
