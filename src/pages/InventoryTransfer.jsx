/**
 * @fileoverview Inventory Transfer Page
 *
 * Transfer inventory between stores with validation and tracking.
 * Shows transfer history and current stock levels.
 */

import { useState, useEffect } from 'react';
import {
    ArrowRightLeft, Building2, Package, Search, Send, History,
    AlertCircle, CheckCircle, X, Calendar
} from 'lucide-react';
import api from '../services/api';
import { toast } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import '../pages/Inventory.css';

function InventoryTransfer() {
    const { user } = useAuthStore();
    const [stores, setStores] = useState([]);
    const [products, setProducts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [sourceStoreId, setSourceStoreId] = useState('');
    const [destinationStoreId, setDestinationStoreId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('restock');
    const [notes, setNotes] = useState('');
    const [productSearch, setProductSearch] = useState('');

    // Stock info
    const [sourceStock, setSourceStock] = useState(0);
    const [destinationStock, setDestinationStock] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (sourceStoreId) {
            loadProducts(sourceStoreId);
        }
    }, [sourceStoreId]);

    useEffect(() => {
        if (selectedProduct && sourceStoreId && destinationStoreId) {
            loadStockInfo();
        }
    }, [selectedProduct, sourceStoreId, destinationStoreId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [storesData, transfersData] = await Promise.all([
                api.stores.getAll(),
                api.stores.getTransfers({ limit: 20 })
            ]);
            setStores(storesData);
            setTransfers(transfersData || []);

            // Set current store as default source
            if (user?.storeId && storesData.length > 0) {
                setSourceStoreId(user.storeId);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load data', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async (storeId) => {
        try {
            const data = await api.products.getAll({ storeId, inStock: true });
            setProducts(data || []);
        } catch (error) {
            console.error('Failed to load products:', error);
            toast.error('Failed to load products', 'Error');
        }
    };

    const loadStockInfo = async () => {
        try {
            const [sourceData, destData] = await Promise.all([
                api.products.getStoreStock(selectedProduct._id, sourceStoreId),
                api.products.getStoreStock(selectedProduct._id, destinationStoreId)
            ]);
            setSourceStock(sourceData?.quantity || 0);
            setDestinationStock(destData?.quantity || 0);
        } catch (error) {
            console.error('Failed to load stock info:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!sourceStoreId || !destinationStoreId || !selectedProduct || !quantity) {
            toast.warning('Please fill in all required fields', 'Validation Error');
            return;
        }

        if (sourceStoreId === destinationStoreId) {
            toast.warning('Source and destination stores must be different', 'Validation Error');
            return;
        }

        const transferQty = parseInt(quantity);
        if (transferQty <= 0) {
            toast.warning('Quantity must be greater than 0', 'Validation Error');
            return;
        }

        if (transferQty > sourceStock) {
            toast.error(`Insufficient stock. Available: ${sourceStock}`, 'Validation Error');
            return;
        }

        try {
            setSubmitting(true);
            await api.stores.transfer({
                sourceStoreId,
                destinationStoreId,
                productId: selectedProduct._id,
                quantity: transferQty,
                reason,
                notes
            });

            toast.success(`Successfully transferred ${transferQty} units`, 'Transfer Complete');

            // Reset form
            setSelectedProduct(null);
            setQuantity('');
            setNotes('');
            setProductSearch('');
            setSourceStock(0);
            setDestinationStock(0);

            // Reload data
            loadData();
            if (sourceStoreId) {
                loadProducts(sourceStoreId);
            }
        } catch (error) {
            console.error('Failed to transfer inventory:', error);
            toast.error(error.message || 'Failed to transfer inventory', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const getFilteredProducts = () => {
        if (!productSearch) return products;
        const search = productSearch.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.sku?.toLowerCase().includes(search) ||
            p.barcode?.toLowerCase().includes(search)
        );
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStoreName = (storeId) => {
        const store = stores.find(s => s._id === storeId);
        return store?.name || 'Unknown Store';
    };

    if (loading) {
        return (
            <div className="inventory-page">
                <div className="inventory-loading">
                    <div className="inventory-loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inventory-page">
            {/* Header */}
            <div className="inventory-header">
                <div>
                    <h1>Inventory Transfer</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Transfer inventory between stores
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Transfer Form */}
                <div className="inventory-form">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <ArrowRightLeft size={24} style={{ color: 'var(--primary-color)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>New Transfer</h2>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Store Selection */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="inventory-form-group">
                                <label className="inventory-form-label required">Source Store</label>
                                <select
                                    className="inventory-form-select"
                                    value={sourceStoreId}
                                    onChange={(e) => {
                                        setSourceStoreId(e.target.value);
                                        setSelectedProduct(null);
                                        setProductSearch('');
                                    }}
                                    required
                                >
                                    <option value="">Select source store</option>
                                    {stores.map(store => (
                                        <option key={store._id} value={store._id}>{store.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.625rem' }}>
                                <ArrowRightLeft size={20} style={{ color: 'var(--primary-color)' }} />
                            </div>

                            <div className="inventory-form-group">
                                <label className="inventory-form-label required">Destination Store</label>
                                <select
                                    className="inventory-form-select"
                                    value={destinationStoreId}
                                    onChange={(e) => setDestinationStoreId(e.target.value)}
                                    required
                                >
                                    <option value="">Select destination store</option>
                                    {stores.filter(s => s._id !== sourceStoreId).map(store => (
                                        <option key={store._id} value={store._id}>{store.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div className="inventory-form-group">
                            <label className="inventory-form-label required">Product</label>
                            {!selectedProduct ? (
                                <>
                                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            className="inventory-form-input"
                                            placeholder="Search products by name, SKU, or barcode..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            disabled={!sourceStoreId}
                                            style={{ paddingLeft: '2.5rem' }}
                                        />
                                    </div>
                                    {productSearch && (
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--background)' }}>
                                            {getFilteredProducts().length > 0 ? (
                                                getFilteredProducts().map(product => (
                                                    <button
                                                        key={product._id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setProductSearch('');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            border: 'none',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            background: 'transparent',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.background = 'var(--surface)'}
                                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                    >
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{product.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            SKU: {product.sku} • Stock: {product.quantity}
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                    No products found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    background: 'rgba(99, 102, 241, 0.05)',
                                    border: '2px solid var(--primary-color)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Package size={18} style={{ color: 'var(--primary-color)' }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedProduct.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                SKU: {selectedProduct.sku}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedProduct(null);
                                            setQuantity('');
                                            setSourceStock(0);
                                            setDestinationStock(0);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-secondary)',
                                            padding: '0.25rem'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Stock Display */}
                        {selectedProduct && sourceStoreId && destinationStoreId && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1rem',
                                padding: '1rem',
                                background: 'var(--surface)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        Source Stock
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: sourceStock > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                        {sourceStock} units
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        Destination Stock
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--info-color)' }}>
                                        {destinationStock} units
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="inventory-form-group">
                            <label className="inventory-form-label required">
                                Quantity to Transfer
                            </label>
                            <input
                                type="number"
                                className="inventory-form-input"
                                placeholder="Enter quantity"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                                max={sourceStock}
                                required
                                disabled={!selectedProduct}
                            />
                            {quantity && sourceStock > 0 && parseInt(quantity) > sourceStock && (
                                <div className="inventory-form-error">
                                    <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    Insufficient stock (Available: {sourceStock})
                                </div>
                            )}
                        </div>

                        {/* Reason */}
                        <div className="inventory-form-group">
                            <label className="inventory-form-label required">Transfer Reason</label>
                            <select
                                className="inventory-form-select"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            >
                                <option value="restock">Restock</option>
                                <option value="balance">Balance Inventory</option>
                                <option value="promotion">Promotion</option>
                                <option value="return">Return</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="inventory-form-group">
                            <label className="inventory-form-label">Notes</label>
                            <textarea
                                className="inventory-form-textarea"
                                placeholder="Add any additional notes about this transfer..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="inventory-form-actions">
                            <button
                                type="submit"
                                className="inventory-btn inventory-btn-primary inventory-btn-lg"
                                disabled={submitting || !selectedProduct || !quantity || parseInt(quantity) > sourceStock}
                                style={{ flex: 1 }}
                            >
                                {submitting ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Submit Transfer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Transfer History */}
                <div className="inventory-form">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <History size={24} style={{ color: 'var(--secondary-color)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Recent Transfers</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                        {transfers.length > 0 ? (
                            transfers.map(transfer => (
                                <div
                                    key={transfer._id}
                                    style={{
                                        padding: '1rem',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Package size={16} style={{ color: 'var(--primary-color)' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                {transfer.product?.name || 'Unknown Product'}
                                            </span>
                                        </div>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            background: transfer.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: transfer.status === 'completed' ? 'var(--success-color)' : 'var(--warning-color)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase'
                                        }}>
                                            {transfer.status || 'Pending'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <Building2 size={14} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {getStoreName(transfer.sourceStoreId)}
                                        </span>
                                        <ArrowRightLeft size={14} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {getStoreName(transfer.destinationStoreId)}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.875rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Quantity: </span>
                                            <span style={{ fontWeight: 600 }}>{transfer.quantity} units</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                            {formatDate(transfer.createdAt)}
                                        </div>
                                    </div>

                                    {transfer.notes && (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'var(--background)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.8125rem',
                                            color: 'var(--text-secondary)',
                                            fontStyle: 'italic'
                                        }}>
                                            {transfer.notes}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="inventory-empty">
                                <History size={48} className="inventory-empty-icon" />
                                <h3 className="inventory-empty-title">No Transfer History</h3>
                                <p className="inventory-empty-message">
                                    Transfer history will appear here once you complete transfers
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InventoryTransfer;
