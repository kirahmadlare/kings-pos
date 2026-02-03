import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import { productSync } from '../services/sync';
import {
    Plus, Search, Package, Truck, AlertTriangle,
    ChevronDown, ChevronUp, X, Save, Clock, Check, XCircle, Download
} from 'lucide-react';
import AdvancedSearchBar from '../components/AdvancedSearchBar';
import Pagination from '../components/Pagination';
import ExportModal from '../components/ExportModal';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import './Orders.css';

function Orders() {
    const { store } = useAuthStore();
    const { formatCurrency } = useCurrency();
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [formData, setFormData] = useState({
        supplierId: '',
        items: [],
        notes: '',
        expectedDate: ''
    });

    // Helper function to get supplier name
    const getSupplierName = (supplierId) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier?.name || 'Unknown Supplier';
    };

    // Advanced search configuration
    const enrichedOrders = purchaseOrders.map(order => ({
        ...order,
        supplierName: getSupplierName(order.supplierId)
    }));

    const searchConfig = {
        searchFields: ['supplierName', 'notes'],
        filterFields: {
            status: {
                label: 'Status',
                type: 'select',
                options: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'ordered', label: 'Ordered' },
                    { value: 'received', label: 'Received' },
                    { value: 'cancelled', label: 'Cancelled' }
                ]
            },
            total: {
                label: 'Order Total',
                type: 'range',
                min: 0
            },
            createdAt: {
                label: 'Order Date',
                type: 'daterange'
            }
        },
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        itemsPerPage: 10
    };

    const search = useAdvancedSearch(enrichedOrders, searchConfig);

    useEffect(() => {
        loadData();
    }, [store?.id]);

    const loadData = async () => {
        if (!store?.id) return;

        try {
            const [productsData, suppliersData, ordersData] = await Promise.all([
                db.products.where('storeId').equals(store.id).toArray(),
                db.suppliers.where('storeId').equals(store.id).toArray(),
                db.purchaseOrders.where('storeId').equals(store.id).toArray()
            ]);

            const lowStock = productsData.filter(p =>
                p.quantity <= (p.lowStockThreshold || 5)
            );

            setProducts(productsData);
            setSuppliers(suppliersData);
            setPurchaseOrders(ordersData.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            ));
            setLowStockProducts(lowStock);
        } catch (error) {
            console.error('Failed to load orders data:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const openCreateOrder = () => {
        setFormData({
            supplierId: suppliers[0]?.id || '',
            items: lowStockProducts.map(p => ({
                productId: p.id,
                name: p.name,
                currentQty: p.quantity,
                orderQty: Math.max(10, (p.lowStockThreshold || 5) * 2 - p.quantity),
                costPrice: p.costPrice || 0
            })),
            notes: '',
            expectedDate: ''
        });
        setShowModal(true);
    };

    const updateOrderItem = (productId, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.productId === productId ? { ...item, [field]: value } : item
            )
        }));
    };

    const removeOrderItem = (productId) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.productId !== productId)
        }));
    };

    const addProductToOrder = (product) => {
        if (formData.items.find(i => i.productId === product.id)) return;

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                productId: product.id,
                name: product.name,
                currentQty: product.quantity,
                orderQty: 10,
                costPrice: product.costPrice || 0
            }]
        }));
    };

    const getOrderTotal = () => {
        return formData.items.reduce((sum, item) =>
            sum + (item.orderQty * item.costPrice), 0
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.items.length === 0) return;

        try {
            await db.purchaseOrders.add({
                storeId: store.id,
                supplierId: parseInt(formData.supplierId) || null,
                items: formData.items,
                status: 'pending',
                total: getOrderTotal(),
                notes: formData.notes,
                expectedDate: formData.expectedDate || null,
                createdAt: new Date().toISOString()
            });

            await loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to create order:', error);
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        try {
            await db.purchaseOrders.update(orderId, { status });

            // If received, update product quantities and sync to server
            if (status === 'received') {
                const order = purchaseOrders.find(o => o.id === orderId);
                if (order) {
                    for (const item of order.items) {
                        try {
                            // Use productSync.updateStock() to ensure sync
                            // Positive quantity change to add to stock
                            await productSync.updateStock(item.productId, item.orderQty, 'purchase_order');
                        } catch (error) {
                            console.error(`Failed to update stock for product ${item.productId}:`, error);
                            // Continue with other items
                        }
                    }
                }
            }

            await loadData();
        } catch (error) {
            console.error('Failed to update order:', error);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: 'var(--warning-100)', color: 'var(--warning-600)' },
            ordered: { bg: 'var(--primary-100)', color: 'var(--primary-600)' },
            received: { bg: 'var(--success-100)', color: 'var(--success-600)' },
            cancelled: { bg: 'var(--danger-100)', color: 'var(--danger-600)' }
        };
        const style = styles[status] || styles.pending;
        return (
            <span className="badge" style={{ backgroundColor: style.bg, color: style.color }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="orders-loading">
                <div className="spinner spinner-lg" />
                <p>Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="orders">
            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <div className="low-stock-alert">
                    <div className="alert-content">
                        <AlertTriangle size={20} />
                        <div>
                            <strong>{lowStockProducts.length} products are running low on stock</strong>
                            <p>Consider creating a purchase order to restock these items.</p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={openCreateOrder}>
                        <Plus size={18} />
                        Create Order
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="orders-header">
                <h2>Purchase Orders</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
                        <Download size={18} />
                        Export
                    </button>
                    <button className="btn btn-primary" onClick={openCreateOrder}>
                        <Plus size={18} />
                        New Order
                    </button>
                </div>
            </div>

            {/* Advanced Search */}
            {purchaseOrders.length > 0 && (
                <div className="mb-4">
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
                            { value: 'createdAt', label: 'Order Date' },
                            { value: 'total', label: 'Total Amount' },
                            { value: 'status', label: 'Status' },
                            { value: 'supplierName', label: 'Supplier' }
                        ]}
                        placeholder="Search purchase orders by supplier or notes..."
                    />
                </div>
            )}

            {/* Orders List */}
            {search.totalResults === 0 ? (
                <div className="empty-orders">
                    <Truck size={48} />
                    <h3>No purchase orders yet</h3>
                    <p>Create your first order to restock inventory</p>
                    <button className="btn btn-primary" onClick={openCreateOrder}>
                        <Plus size={18} />
                        Create Order
                    </button>
                </div>
            ) : (
                <>
                <div className="orders-list">
                    {search.data.map(order => (
                        <div key={order.id} className="order-card">
                            <div
                                className="order-header"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="order-info">
                                    <span className="order-id">Order #{order.id}</span>
                                    <span className="order-date">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="order-meta">
                                    <span className="order-items">{order.items?.length || 0} items</span>
                                    <span className="order-total">{formatCurrency(order.total)}</span>
                                    {getStatusBadge(order.status)}
                                    {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div className="order-details">
                                    <div className="order-supplier">
                                        <strong>Supplier:</strong> {getSupplierName(order.supplierId)}
                                    </div>

                                    <table className="order-items-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Quantity</th>
                                                <th>Cost</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items?.map((item, i) => (
                                                <tr key={i}>
                                                    <td>{item.name}</td>
                                                    <td>{item.orderQty}</td>
                                                    <td>{formatCurrency(item.costPrice)}</td>
                                                    <td>{formatCurrency(item.orderQty * item.costPrice)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {order.notes && (
                                        <div className="order-notes">
                                            <strong>Notes:</strong> {order.notes}
                                        </div>
                                    )}

                                    {order.status === 'pending' && (
                                        <div className="order-actions">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => updateOrderStatus(order.id, 'ordered')}
                                            >
                                                <Clock size={16} />
                                                Mark as Ordered
                                            </button>
                                            <button
                                                className="btn btn-ghost text-danger"
                                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                            >
                                                <XCircle size={16} />
                                                Cancel
                                            </button>
                                        </div>
                                    )}

                                    {order.status === 'ordered' && (
                                        <div className="order-actions">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => updateOrderStatus(order.id, 'received')}
                                            >
                                                <Check size={16} />
                                                Mark as Received
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

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
                </>
            )}

            {/* Create Order Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Purchase Order</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="input-group">
                                        <label className="input-label">Supplier</label>
                                        <select
                                            className="input select"
                                            value={formData.supplierId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                                        >
                                            <option value="">Select supplier</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Expected Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={formData.expectedDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="order-items-section">
                                    <h4>Order Items</h4>
                                    {formData.items.length === 0 ? (
                                        <p className="text-secondary">No items added yet</p>
                                    ) : (
                                        <table className="order-items-table">
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Current Stock</th>
                                                    <th>Order Qty</th>
                                                    <th>Cost</th>
                                                    <th>Total</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.items.map(item => (
                                                    <tr key={item.productId}>
                                                        <td>{item.name}</td>
                                                        <td className={item.currentQty <= 5 ? 'text-danger' : ''}>
                                                            {item.currentQty}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="input input-sm"
                                                                value={item.orderQty}
                                                                onChange={(e) => updateOrderItem(item.productId, 'orderQty', parseInt(e.target.value) || 0)}
                                                                min="1"
                                                                style={{ width: '80px' }}
                                                            />
                                                        </td>
                                                        <td>{formatCurrency(item.costPrice)}</td>
                                                        <td>{formatCurrency(item.orderQty * item.costPrice)}</td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm text-danger"
                                                                onClick={() => removeOrderItem(item.productId)}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        Total:
                                                    </td>
                                                    <td style={{ fontWeight: 700 }}>
                                                        {formatCurrency(getOrderTotal())}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Notes</label>
                                    <textarea
                                        className="input"
                                        rows="2"
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Optional notes for this order..."
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={formData.items.length === 0}
                                >
                                    <Save size={18} />
                                    Create Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                entityType="purchase-orders"
                entityName="Purchase Orders"
                availableColumns={[
                    { key: 'id', label: 'Order ID' },
                    { key: 'supplierName', label: 'Supplier' },
                    { key: 'status', label: 'Status' },
                    { key: 'total', label: 'Total Amount' },
                    { key: 'expectedDate', label: 'Expected Date' },
                    { key: 'notes', label: 'Notes' },
                    { key: 'createdAt', label: 'Order Date' },
                    { key: 'updatedAt', label: 'Last Updated' }
                ]}
                currentFilters={search.filters}
                endpoint="/export/purchase-orders"
            />
        </div>
    );
}

export default Orders;
