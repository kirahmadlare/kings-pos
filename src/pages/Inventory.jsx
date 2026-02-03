/**
 * @fileoverview Inventory Management Page
 * 
 * This page provides complete inventory management functionality including:
 * - Product listing with grid and list views
 * - Search and category filtering
 * - Add/Edit/Delete products
 * - Barcode scanning for quick product lookup
 * - Low stock alerts and discount scheduling
 * 
 * @requires React, useEffect, useState
 * @requires ../stores/authStore for user/store context
 * @requires ../db for IndexedDB operations
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import { productSync } from '../services/sync';
import {
    Plus, Search, Filter, Grid, List, Edit2, Trash2,
    Package, Camera, Barcode, X, Save, AlertTriangle, ScanLine, Cloud,
    Upload, Download
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import BulkImportModal from '../components/BulkImportModal';
import ExportModal from '../components/ExportModal';
import AdvancedSearchBar from '../components/AdvancedSearchBar';
import Pagination from '../components/Pagination';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import api from '../services/api';
import './Inventory.css';

/**
 * Inventory Component - Main inventory management page
 * 
 * Handles all CRUD operations for products and provides
 * search, filtering, and bulk operations functionality.
 */
function Inventory() {
    // Get current store from auth context
    const { store } = useAuthStore();
    const { formatCurrency } = useCurrency();

    // Product and category data
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI state
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Modal and form state
    const [showModal, setShowModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Form data for add/edit product
    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        sku: '',
        categoryId: '',
        price: '',
        costPrice: '',
        quantity: '',
        lowStockThreshold: '5',
        discountPercent: '',
        discountStart: '',
        discountEnd: '',
        imageUrl: ''
    });

    /**
     * Load products and categories when store changes.
     * This effect runs on initial mount and when store ID changes.
     */
    useEffect(() => {
        loadData();
    }, [store?.id]);

    /**
     * Fetch all products and categories from server (when online) or IndexedDB (when offline).
     * Updates local state with the retrieved data.
     */
    const loadData = async () => {
        if (!store?.id) return;

        try {
            // Try to fetch from server first (when online), fall back to IndexedDB
            const { productAPI } = await import('../services/api');

            const [productsData, categoriesData] = await Promise.all([
                productAPI.getAll().catch(() => db.products.where('storeId').equals(store.id).toArray()),
                db.categories.where('storeId').equals(store.id).toArray() // Categories are local only
            ]);

            console.log('📦 API returned products:', productsData?.length, 'products');

            // Enrich API products with local IndexedDB IDs
            let enrichedProducts = productsData;
            if (Array.isArray(productsData) && productsData.length > 0) {
                enrichedProducts = await Promise.all(
                    productsData.map(async (product) => {
                        if (product._id) {
                            const localProduct = await db.products.where('serverId').equals(product._id).first();
                            if (localProduct) {
                                // Merge server data with local ID
                                return {
                                    ...product,
                                    id: localProduct.id, // Add local IndexedDB ID
                                    serverId: product._id
                                };
                            }
                        }
                        return product;
                    })
                );
            }

            setProducts(enrichedProducts);
            setCategories(categoriesData);

            // Update IndexedDB with fresh server data
            if (Array.isArray(productsData) && productsData.length > 0) {
                for (const product of productsData) {
                    if (product._id) {
                        const existing = await db.products.where('serverId').equals(product._id).first();
                        if (existing) {
                            await db.products.update(existing.id, {
                                ...product,
                                serverId: product._id,
                                storeId: store.id,
                                needsSync: false
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load inventory:', error);
            // Final fallback to IndexedDB
            try {
                const [productsData, categoriesData] = await Promise.all([
                    db.products.where('storeId').equals(store.id).toArray(),
                    db.categories.where('storeId').equals(store.id).toArray()
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
            } catch (dbError) {
                console.error('Failed to load from IndexedDB:', dbError);
            }
        } finally {
            setIsLoading(false);
        }
    };


    // Advanced search configuration
    const searchConfig = {
        searchFields: ['name', 'sku', 'barcode', 'description'],
        filterFields: {
            categoryId: {
                label: 'Category',
                type: 'select',
                options: categories.map(cat => ({ value: cat.id, label: cat.name }))
            },
            price: {
                label: 'Price',
                type: 'range'
            },
            quantity: {
                label: 'Stock',
                type: 'range'
            },
            isActive: {
                label: 'Active',
                type: 'boolean'
            }
        },
        defaultSort: 'name',
        defaultOrder: 'asc',
        itemsPerPage: 20
    };

    const search = useAdvancedSearch(products, searchConfig);

    /**
     * Handle form input changes for the product form.
     * @param {Event} e - The input change event
     */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /**
     * Open the add product modal with empty form.
     */
    const openAddModal = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            barcode: '',
            sku: '',
            categoryId: categories[0]?.id || '',
            price: '',
            costPrice: '',
            quantity: '',
            lowStockThreshold: '5',
            discountPercent: '',
            discountStart: '',
            discountEnd: '',
            imageUrl: ''
        });
        setShowModal(true);
    };

    /**
     * Open the edit product modal with existing product data.
     * @param {Object} product - The product to edit
     */
    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            barcode: product.barcode || '',
            sku: product.sku || '',
            categoryId: product.categoryId || '',
            price: product.price?.toString() || '',
            costPrice: product.costPrice?.toString() || '',
            quantity: product.quantity?.toString() || '',
            lowStockThreshold: product.lowStockThreshold?.toString() || '5',
            discountPercent: product.discountPercent?.toString() || '',
            discountStart: product.discountStart || '',
            discountEnd: product.discountEnd || '',
            imageUrl: product.imageUrl || ''
        });
        setShowModal(true);
    };

    /**
     * Handle barcode scan result.
     * Searches for existing product with scanned barcode or fills form.
     * @param {string} barcode - The scanned barcode value
     */
    const handleBarcodeScan = (barcode) => {
        // Check if product with this barcode exists
        const existingProduct = products.find(p => p.barcode === barcode);

        if (existingProduct) {
            // Open edit modal for existing product
            openEditModal(existingProduct);
        } else {
            // Start new product with scanned barcode
            openAddModal();
            setFormData(prev => ({ ...prev, barcode }));
        }

        setShowScanner(false);
    };

    /**
     * Submit the product form (create or update).
     * @param {Event} e - The form submit event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log('🔄 Form submitted for', editingProduct ? 'UPDATE' : 'CREATE');
        console.log('📝 Form data:', formData);

        // Prepare product data object
        const productData = {
            storeId: store.id,
            name: formData.name,
            barcode: formData.barcode || null,
            sku: formData.sku || null,
            categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
            price: parseFloat(formData.price) || 0,
            costPrice: parseFloat(formData.costPrice) || 0,
            lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
            discountPercent: parseFloat(formData.discountPercent) || null,
            discountStart: formData.discountStart || null,
            discountEnd: formData.discountEnd || null,
            imageUrl: formData.imageUrl || null,
            isActive: true,
            updatedAt: new Date().toISOString()
        };

        // Only include quantity when creating new products
        // Quantity should be updated through stock movements, not product edits
        if (!editingProduct) {
            productData.quantity = parseInt(formData.quantity) || 0;
        }

        console.log('📦 Product data to save:', productData);

        try {
            if (editingProduct) {
                // Update existing product and sync to server (excluding quantity)
                console.log('⚙️ Updating product ID:', editingProduct.id);
                const result = await productSync.update(editingProduct.id, productData);
                console.log('✅ Product updated, synced:', result.synced);
            } else {
                // Create new product and sync to server
                console.log('⚙️ Creating new product');
                const result = await productSync.create(productData, store.id);
                console.log('✅ Product created, synced:', result.synced);
            }

            console.log('🔄 Reloading inventory data...');
            await loadData();
            console.log('✅ Modal closing');
            setShowModal(false);
        } catch (error) {
            console.error('❌ Failed to save product:', error);
            alert(`Failed to save product: ${error.message}`);
        }
    };

    /**
     * Delete a product after confirmation.
     * @param {number} productId - The ID of the product to delete
     */
    const handleDelete = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            const result = await productSync.delete(productId);
            console.log('Product deleted, synced:', result.synced);
            await loadData();
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    /**
     * Get category name by ID.
     * @param {number} categoryId - The category ID
     * @returns {string} Category name or 'Uncategorized'
     */
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.name || 'Uncategorized';
    };

    /**
     * Get category color by ID.
     * @param {number} categoryId - The category ID
     * @returns {string} Category color hex code
     */
    const getCategoryColor = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.color || '#6b7280';
    };

    // Show loading state while fetching data
    if (isLoading) {
        return (
            <div className="inventory-loading">
                <div className="spinner spinner-lg" />
                <p>Loading inventory...</p>
            </div>
        );
    }

    return (
        <div className="inventory">
            {/* Header Section with Search and Actions */}
            <div className="inventory-header">
                {/* Advanced Search Bar */}
                <div className="flex-1">
                    <AdvancedSearchBar
                        searchQuery={search.searchQuery}
                        onSearchChange={search.setSearchQuery}
                        filters={search.filters}
                        filterFields={searchConfig.filterFields}
                        onUpdateFilter={search.updateFilter}
                        onRemoveFilter={search.removeFilter}
                        onClearFilters={search.clearFilters}
                        activeFilterCount={search.activeFilterCount}
                        sortBy={search.sortBy}
                        sortOrder={search.sortOrder}
                        onToggleSort={search.toggleSort}
                        sortOptions={[
                            { value: 'name', label: 'Name' },
                            { value: 'price', label: 'Price' },
                            { value: 'quantity', label: 'Stock' },
                            { value: 'createdAt', label: 'Date Added' }
                        ]}
                        placeholder="Search products by name, SKU, barcode..."
                    />
                </div>

                <div className="inventory-actions">
                    {/* Barcode Scanner Button */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowScanner(true)}
                        title="Scan barcode"
                    >
                        <ScanLine size={18} />
                        Scan
                    </button>

                    {/* View Mode Toggle */}
                    <div className="view-toggle">
                        <button
                            className={`btn btn-ghost btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid view"
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            className={`btn btn-ghost btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List view"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {/* Import Button */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowImportModal(true)}
                        title="Import products from CSV/Excel"
                    >
                        <Upload size={18} />
                        Import
                    </button>

                    {/* Export Button */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowExportModal(true)}
                        title="Export products to CSV/Excel/PDF"
                    >
                        <Download size={18} />
                        Export
                    </button>

                    {/* Add Product Button */}
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <Plus size={18} />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Products Display - Grid or List View */}
            {search.data.length === 0 ? (
                <div className="empty-inventory">
                    <Package size={48} />
                    <h3>No products found</h3>
                    <p>
                        {products.length === 0
                            ? "Start by adding your first product to the inventory"
                            : "Try adjusting your search or filter"
                        }
                    </p>
                    {products.length === 0 && (
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <Plus size={18} />
                            Add Your First Product
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="products-grid">
                    {search.data.map(product => (
                        <div key={product.id} className="product-card">
                            <div
                                className="product-image"
                                style={{ backgroundColor: getCategoryColor(product.categoryId) + '20' }}
                            >
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} />
                                ) : (
                                    <Package size={32} style={{ color: getCategoryColor(product.categoryId) }} />
                                )}
                                {product.quantity <= product.lowStockThreshold && (
                                    <span className="low-stock-badge">
                                        <AlertTriangle size={12} /> Low Stock
                                    </span>
                                )}
                            </div>
                            <div className="product-details">
                                <span
                                    className="product-category"
                                    style={{ backgroundColor: getCategoryColor(product.categoryId) }}
                                >
                                    {getCategoryName(product.categoryId)}
                                </span>
                                <h4 className="product-name">{product.name}</h4>
                                <div className="product-meta">
                                    <span className="product-price">{formatCurrency(product.price)}</span>
                                    <span className="product-qty">Qty: {product.quantity}</span>
                                </div>
                                {product.barcode && (
                                    <span className="product-barcode">
                                        <Barcode size={12} /> {product.barcode}
                                    </span>
                                )}
                            </div>
                            <div className="product-actions">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => openEditModal(product)}
                                    title="Edit product"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm text-danger"
                                    onClick={() => handleDelete(product.id)}
                                    title="Delete product"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List/Table View */
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Barcode</th>
                                <th>Price</th>
                                <th>Cost</th>
                                <th>Quantity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {search.data.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="table-product">
                                            <span className="table-product-name">{product.name}</span>
                                            {product.sku && <span className="table-product-sku">SKU: {product.sku}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className="badge"
                                            style={{
                                                backgroundColor: getCategoryColor(product.categoryId) + '20',
                                                color: getCategoryColor(product.categoryId)
                                            }}
                                        >
                                            {getCategoryName(product.categoryId)}
                                        </span>
                                    </td>
                                    <td>{product.barcode || '-'}</td>
                                    <td>{formatCurrency(product.price)}</td>
                                    <td>{formatCurrency(product.costPrice)}</td>
                                    <td>
                                        <span className={product.quantity <= product.lowStockThreshold ? 'text-danger font-semibold' : ''}>
                                            {product.quantity}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => openEditModal(product)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm text-danger"
                                                onClick={() => handleDelete(product.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {search.totalPages > 1 && (
                <Pagination
                    currentPage={search.currentPage}
                    totalPages={search.totalPages}
                    totalResults={search.totalResults}
                    itemsPerPage={search.itemsPerPage}
                    onPageChange={search.goToPage}
                    onPrevPage={search.prevPage}
                    onNextPage={search.nextPage}
                />
            )}

            {/* Barcode Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Add/Edit Product Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    {/* Product Name */}
                                    <div className="input-group span-2">
                                        <label className="input-label">Product Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="input"
                                            placeholder="Enter product name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    {/* Barcode with Scan Button */}
                                    <div className="input-group">
                                        <label className="input-label">Barcode</label>
                                        <div className="input-with-action">
                                            <input
                                                type="text"
                                                name="barcode"
                                                className="input"
                                                placeholder="Scan or enter barcode"
                                                value={formData.barcode}
                                                onChange={handleInputChange}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-icon"
                                                onClick={() => setShowScanner(true)}
                                                title="Scan barcode"
                                            >
                                                <ScanLine size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* SKU */}
                                    <div className="input-group">
                                        <label className="input-label">SKU</label>
                                        <input
                                            type="text"
                                            name="sku"
                                            className="input"
                                            placeholder="Stock keeping unit"
                                            value={formData.sku}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="input-group">
                                        <label className="input-label">Category</label>
                                        <select
                                            name="categoryId"
                                            className="input select"
                                            value={formData.categoryId}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quantity */}
                                    <div className="input-group">
                                        <label className="input-label">
                                            Quantity
                                            {editingProduct && (
                                                <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
                                                    (Read-only)
                                                </span>
                                            )}
                                        </label>
                                        <input
                                            type="number"
                                            name="quantity"
                                            className="input"
                                            placeholder="0"
                                            min="0"
                                            value={formData.quantity}
                                            onChange={handleInputChange}
                                            readOnly={!!editingProduct}
                                            style={editingProduct ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                                        />
                                        {editingProduct && (
                                            <small style={{ color: '#666', fontSize: '0.85em' }}>
                                                Use Purchase Orders or Stock Adjustments to change quantity
                                            </small>
                                        )}
                                    </div>

                                    {/* Cost Price */}
                                    <div className="input-group">
                                        <label className="input-label">Cost Price ({store?.currency || 'USD'})</label>
                                        <input
                                            type="number"
                                            name="costPrice"
                                            className="input"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            value={formData.costPrice}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Retail Price */}
                                    <div className="input-group">
                                        <label className="input-label">Retail Price ({store?.currency || 'USD'}) *</label>
                                        <input
                                            type="number"
                                            name="price"
                                            className="input"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    {/* Low Stock Alert Threshold */}
                                    <div className="input-group">
                                        <label className="input-label">Low Stock Alert</label>
                                        <input
                                            type="number"
                                            name="lowStockThreshold"
                                            className="input"
                                            placeholder="5"
                                            min="0"
                                            value={formData.lowStockThreshold}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Discount Section Header */}
                                    <div className="form-section span-2">
                                        <h4>Discount Settings (Optional)</h4>
                                    </div>

                                    {/* Discount Percent */}
                                    <div className="input-group">
                                        <label className="input-label">Discount %</label>
                                        <input
                                            type="number"
                                            name="discountPercent"
                                            className="input"
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            value={formData.discountPercent}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Discount Date Range */}
                                    <div className="input-group">
                                        <label className="input-label">Discount Start</label>
                                        <input
                                            type="date"
                                            name="discountStart"
                                            className="input"
                                            value={formData.discountStart}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Discount End</label>
                                        <input
                                            type="date"
                                            name="discountEnd"
                                            className="input"
                                            value={formData.discountEnd}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Image URL */}
                                    <div className="input-group">
                                        <label className="input-label">Image URL</label>
                                        <input
                                            type="url"
                                            name="imageUrl"
                                            className="input"
                                            placeholder="https://..."
                                            value={formData.imageUrl}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer with Action Buttons */}
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} />
                                    {editingProduct ? 'Update Product' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="products"
                onSuccess={(results) => {
                    console.log('Import successful:', results);
                    loadData(); // Reload products
                }}
                templateColumns={[
                    { key: 'name', header: 'Product Name', example: 'Coffee Beans' },
                    { key: 'sku', header: 'SKU', example: 'COF-001' },
                    { key: 'barcode', header: 'Barcode', example: '123456789' },
                    { key: 'description', header: 'Description', example: 'Premium coffee beans' },
                    { key: 'price', header: 'Price', example: '15.99' },
                    { key: 'costPrice', header: 'Cost Price', example: '8.00' },
                    { key: 'quantity', header: 'Quantity', example: '100' },
                    { key: 'reorderLevel', header: 'Reorder Level', example: '10' },
                    { key: 'category', header: 'Category', example: 'Beverages' },
                    { key: 'isActive', header: 'Active', example: 'true' }
                ]}
            />

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                entityType="products"
                entityName="Products"
                availableColumns={[
                    { key: 'name', label: 'Product Name' },
                    { key: 'sku', label: 'SKU' },
                    { key: 'barcode', label: 'Barcode' },
                    { key: 'description', label: 'Description' },
                    { key: 'price', label: 'Price' },
                    { key: 'costPrice', label: 'Cost Price' },
                    { key: 'quantity', label: 'Stock Quantity' },
                    { key: 'lowStockThreshold', label: 'Low Stock Threshold' },
                    { key: 'categoryId', label: 'Category ID' },
                    { key: 'isActive', label: 'Active Status' },
                    { key: 'createdAt', label: 'Created Date' },
                    { key: 'updatedAt', label: 'Updated Date' }
                ]}
                currentFilters={search.filters}
                endpoint="/export/products"
            />
        </div>
    );
}

export default Inventory;
