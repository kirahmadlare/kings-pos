import React, { useState, useEffect } from 'react';
import {
  Plus, Package, CheckCircle, XCircle, Clock, Truck, FileText,
  User, Calendar, DollarSign, Filter, RefreshCw, Edit2, X, Search
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import './Inventory.css';

/**
 * PurchaseOrders Component
 *
 * Manages purchase orders with full CRUD operations
 * Allows creating, approving, ordering, and receiving POs
 */
const PurchaseOrders = () => {
  const { store } = useAuthStore();
  const { formatCurrency } = useCurrency();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPO, setEditingPO] = useState(null);
  const [receivingPO, setReceivingPO] = useState(null);
  const [receiveQuantities, setReceiveQuantities] = useState({});
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Supplier form state
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    paymentTerms: 'net-30',
    leadTimeDays: 7,
    notes: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [posResponse, suppliersResponse, productsResponse] = await Promise.all([
        apiRequest('/inventory/purchase-orders'),
        apiRequest('/inventory/suppliers'),
        apiRequest('/products')
      ]);

      setPurchaseOrders(posResponse);
      setSuppliers(suppliersResponse);
      setProducts(productsResponse.filter(p => p.isActive));
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSupplierInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setSupplierFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }));
    } else {
      setSupplierFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openSupplierModal = () => {
    setSupplierFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      paymentTerms: 'net-30',
      leadTimeDays: 7,
      notes: ''
    });
    setShowSupplierModal(true);
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();

    try {
      const newSupplier = await apiRequest('/inventory/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierFormData)
      });

      setSuppliers(prev => [...prev, newSupplier]);
      setShowSupplierModal(false);

      // Automatically select the new supplier in the PO form
      setFormData(prev => ({ ...prev, supplierId: newSupplier._id }));
    } catch (error) {
      console.error('Failed to create supplier:', error);
      alert('Failed to create supplier. Please try again.');
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '', unitPrice: '' }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const openCreateModal = () => {
    setEditingPO(null);
    setFormData({
      supplierId: suppliers[0]?._id || '',
      expectedDeliveryDate: '',
      notes: '',
      items: []
    });
    setProductSearchTerm('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get supplier name
    const selectedSupplier = suppliers.find(s => s._id === formData.supplierId);
    const supplierName = selectedSupplier?.name || '';

    const poData = {
      supplierId: formData.supplierId,
      supplierName: supplierName,
      expectedDeliveryDate: formData.expectedDeliveryDate,
      notes: formData.notes,
      items: formData.items.map(item => ({
        productId: item.productId,
        quantity: parseInt(item.quantity),
        costPrice: parseFloat(item.unitPrice)
      }))
    };

    try {
      if (editingPO) {
        await apiRequest(`/inventory/purchase-orders/${editingPO._id}`, {
          method: 'PUT',
          body: JSON.stringify(poData)
        });
      } else {
        await apiRequest('/inventory/purchase-orders', {
          method: 'POST',
          body: JSON.stringify(poData)
        });
      }

      await loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save purchase order:', error);
    }
  };

  const handleApprovePO = async (poId) => {
    if (!window.confirm('Approve this purchase order?')) return;

    try {
      await apiRequest(`/inventory/purchase-orders/${poId}/approve`, {
        method: 'PUT'
      });
      await loadData();
    } catch (error) {
      console.error('Failed to approve PO:', error);
      alert('Failed to approve purchase order. Please try again.');
    }
  };

  const openReceiveModal = (po) => {
    setReceivingPO(po);
    const quantities = {};
    po.items.forEach(item => {
      // Handle both populated (object) and unpopulated (string) productId
      const productId = typeof item.productId === 'object' ? item.productId._id : item.productId;
      quantities[productId] = item.quantity;
    });
    setReceiveQuantities(quantities);
  };

  const handleReceiveQuantityChange = (productId, value) => {
    setReceiveQuantities(prev => ({
      ...prev,
      [productId]: parseInt(value) || 0
    }));
  };

  const handleReceiveItems = async () => {
    if (!receivingPO) return;

    try {
      // Convert receivedQuantities to receivedItems format expected by backend
      const receivedItems = receivingPO.items.map(item => {
        const productId = typeof item.productId === 'object' ? item.productId._id : item.productId;
        return {
          itemId: item._id,
          quantity: receiveQuantities[productId] || 0
        };
      });

      console.log('Sending receivedItems:', receivedItems);
      console.log('Receive quantities state:', receiveQuantities);

      await apiRequest(`/inventory/purchase-orders/${receivingPO._id}/receive`, {
        method: 'PUT',
        body: JSON.stringify({ receivedItems })
      });

      // Refresh products to get updated quantities
      console.log('📦 Refreshing products after receiving PO...');
      try {
        const { productAPI } = await import('../services/api');
        const updatedProducts = await productAPI.getAll();

        // Update IndexedDB with fresh quantities
        for (const product of updatedProducts) {
          if (product._id) {
            const existing = await db.products.where('serverId').equals(product._id).first();
            if (existing) {
              await db.products.update(existing.id, {
                ...product,
                id: existing.id,
                serverId: product._id,
                storeId: store?.id || product.storeId,
                needsSync: false
              });
              console.log(`  ✓ Updated ${product.name} qty to ${product.quantity}`);
            }
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh products:', refreshError);
      }

      alert('Items received successfully! Inventory has been updated.');
      await loadData();
      setReceivingPO(null);
      setReceiveQuantities({});
    } catch (error) {
      console.error('Failed to receive items:', error);
      alert('Failed to receive items. Please try again.');
    }
  };

  const handleCancelPO = async (poId) => {
    if (!window.confirm('Cancel this purchase order? This action cannot be undone.')) return;

    try {
      await apiRequest(`/inventory/purchase-orders/${poId}/cancel`, {
        method: 'PUT'
      });
      await loadData();
    } catch (error) {
      console.error('Failed to cancel PO:', error);
      alert('Failed to cancel purchase order. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', class: 'draft', icon: FileText },
      pending: { label: 'Pending', class: 'pending', icon: Clock },
      approved: { label: 'Approved', class: 'approved', icon: CheckCircle },
      ordered: { label: 'Ordered', class: 'ordered', icon: Truck },
      received: { label: 'Received', class: 'received', icon: Package },
      cancelled: { label: 'Cancelled', class: 'cancelled', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`purchase-order-status ${config.class}`}>
        <Icon size={12} style={{ marginRight: '0.25rem' }} />
        {config.label}
      </span>
    );
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s =>
      s._id === supplierId ||
      s.serverId === supplierId ||
      s.id === supplierId
    );
    return supplier?.name || 'Unknown Supplier';
  };

  const getProductName = (productId) => {
    const product = products.find(p =>
      p._id === productId ||
      p.serverId === productId ||
      p.id === productId
    );
    return product?.name || 'Unknown Product';
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * (item.costPrice || item.unitPrice || 0)), 0);
  };


  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredPOs = statusFilter === 'all'
    ? purchaseOrders
    : purchaseOrders.filter(po => po.status === statusFilter);

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="inventory-loading">
          <div className="inventory-loading-spinner" />
          Loading purchase orders...
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="inventory-header">
        <div>
          <h1>Purchase Orders</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Manage purchase orders and track incoming inventory
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadData}
            className="inventory-btn inventory-btn-secondary"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inventory-btn inventory-btn-primary"
          >
            <Plus size={18} />
            Create PO
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Status:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'draft', 'pending', 'approved', 'ordered', 'received', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`inventory-btn inventory-btn-sm ${statusFilter === status ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders List */}
      {filteredPOs.length === 0 ? (
        <div className="inventory-empty">
          <div className="inventory-empty-icon">📋</div>
          <h3 className="inventory-empty-title">No Purchase Orders Found</h3>
          <p className="inventory-empty-message">
            {statusFilter === 'all'
              ? 'Create your first purchase order to start managing inventory'
              : `No purchase orders with status "${statusFilter}"`}
          </p>
          {statusFilter === 'all' && (
            <button onClick={openCreateModal} className="inventory-btn inventory-btn-primary">
              <Plus size={18} />
              Create First PO
            </button>
          )}
        </div>
      ) : (
        <div className="purchase-orders-grid">
          {filteredPOs.map(po => (
            <div key={po._id} className="purchase-order-card">
              <div className="purchase-order-header">
                <div>
                  <h3 className="purchase-order-number">PO #{po.orderNumber}</h3>
                  <p className="purchase-order-supplier">
                    <User size={14} style={{ marginRight: '0.25rem' }} />
                    {getSupplierName(po.supplierId)}
                  </p>
                </div>
                {getStatusBadge(po.status)}
              </div>

              <div className="purchase-order-items">
                <p className="purchase-order-items-label">Items:</p>
                <div className="purchase-order-items-list">
                  {po.items.map((item, index) => (
                    <div key={index}>
                      {getProductName(item.productId)} - {item.quantity} units @ {formatCurrency(item.costPrice || item.unitPrice || 0)}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ margin: '1rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Created:</span>
                  <span>{formatDate(po.createdAt)}</span>
                </div>
                {po.expectedDeliveryDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Expected:</span>
                    <span>{formatDate(po.expectedDeliveryDate)}</span>
                  </div>
                )}
                {po.receivedDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Received:</span>
                    <span>{formatDate(po.receivedDate)}</span>
                  </div>
                )}
              </div>

              <div className="purchase-order-footer">
                <div className="purchase-order-total">
                  Total: {formatCurrency(calculateTotal(po.items))}
                </div>
                <div className="purchase-order-actions">
                  {(po.status === 'draft' || po.status === 'pending') && (
                    <button
                      onClick={() => handleApprovePO(po._id)}
                      className="inventory-btn inventory-btn-sm inventory-btn-success"
                      title="Approve PO"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                  )}
                  {(po.status === 'approved' || po.status === 'ordered') && (
                    <button
                      onClick={() => openReceiveModal(po)}
                      className="inventory-btn inventory-btn-sm inventory-btn-primary"
                      title="Receive items"
                    >
                      <Package size={16} />
                      Receive
                    </button>
                  )}
                  {po.status !== 'received' && po.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancelPO(po._id)}
                      className="inventory-btn inventory-btn-sm inventory-btn-danger"
                      title="Cancel PO"
                    >
                      <XCircle size={16} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit PO Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="inventory-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="inventory-form-label required" style={{ marginBottom: 0 }}>Supplier</label>
                    <button
                      type="button"
                      onClick={openSupplierModal}
                      className="inventory-btn inventory-btn-sm inventory-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      <Plus size={14} />
                      Add Supplier
                    </button>
                  </div>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleInputChange}
                    className="inventory-form-select"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inventory-form-group">
                  <label className="inventory-form-label">Expected Delivery Date</label>
                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleInputChange}
                    className="inventory-form-input"
                  />
                </div>

                <div className="inventory-form-group">
                  <label className="inventory-form-label">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="inventory-form-textarea"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="inventory-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="inventory-form-label" style={{ marginBottom: 0 }}>Items</label>
                  </div>

                  {/* Product Search Bar */}
                  <div style={{ marginBottom: '1rem', position: 'relative' }}>
                    <Search size={18} style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-tertiary)',
                      zIndex: 1
                    }} />
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="inventory-form-input"
                      placeholder="Search and click to add products..."
                      style={{ paddingLeft: '2.5rem' }}
                    />

                    {/* Search Results Dropdown */}
                    {productSearchTerm && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '0.25rem',
                        zIndex: 1000,
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}>
                        {products.filter(p =>
                          p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        ).map(product => (
                          <div
                            key={product._id || product.id}
                            onClick={() => {
                              const productId = product._id || product.serverId || product.id;
                              console.log('Adding product:', product.name, 'ID:', productId);

                              // Check if product already exists in items
                              const existingIndex = formData.items.findIndex(item => item.productId === productId);
                              if (existingIndex >= 0) {
                                alert('Product already added to this order');
                              } else {
                                // Add as new item
                                setFormData(prev => ({
                                  ...prev,
                                  items: [...prev.items, {
                                    productId: productId,
                                    quantity: '1',
                                    unitPrice: product.costPrice || product.price || ''
                                  }]
                                }));
                              }
                              setProductSearchTerm('');
                            }}
                            style={{
                              padding: '0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>SKU: {product.sku || 'N/A'}</span>
                              <span>Stock: {product.quantity || 0} units</span>
                            </div>
                          </div>
                        ))}
                        {products.filter(p =>
                          p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        ).length === 0 && (
                          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {formData.items.length === 0 && (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '2px dashed var(--border-color)'
                    }}>
                      <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <p style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>No items added yet</p>
                      <p style={{ fontSize: '0.875rem' }}>Search and click products above to add them to this order</p>
                    </div>
                  )}

                  {formData.items.map((item, index) => {
                    const selectedProduct = products.find(p =>
                      p._id === item.productId ||
                      p.serverId === item.productId ||
                      p.id === item.productId
                    );

                    console.log('Item:', item.productId, 'Found product:', selectedProduct?.name);

                    return (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-md)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                            {selectedProduct?.name || 'Unknown Product'}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>SKU: {selectedProduct?.sku || 'N/A'}</span>
                            <span>Current Stock: {selectedProduct?.quantity || 0} units</span>
                          </div>
                        </div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="inventory-form-input"
                          placeholder="Qty"
                          min="1"
                          required
                        />
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="inventory-form-input"
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="inventory-btn inventory-btn-sm inventory-btn-danger"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="inventory-form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="inventory-btn inventory-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="inventory-btn inventory-btn-primary">
                  {editingPO ? 'Update PO' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {receivingPO && (
        <div className="modal-overlay" onClick={() => setReceivingPO(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Receive Items - PO #{receivingPO.orderNumber}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setReceivingPO(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Enter the actual quantities received for each item:
              </p>

              {receivingPO.items.map((item, index) => {
                // Handle both populated (object) and unpopulated (string) productId
                const productId = typeof item.productId === 'object' ? item.productId._id : item.productId;
                const productName = typeof item.productId === 'object' ? item.productId.name : getProductName(item.productId);

                return (
                  <div key={index} className="inventory-form-group">
                    <label className="inventory-form-label">
                      {productName}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={receiveQuantities[productId] || 0}
                        onChange={(e) => handleReceiveQuantityChange(productId, e.target.value)}
                        className="inventory-form-input"
                        min="0"
                        max={item.quantity}
                      />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        / {item.quantity} ordered
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="inventory-form-actions">
              <button onClick={() => setReceivingPO(null)} className="inventory-btn inventory-btn-secondary">
                Cancel
              </button>
              <button onClick={handleReceiveItems} className="inventory-btn inventory-btn-success">
                <Package size={18} />
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Supplier</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSupplierModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit}>
              <div className="modal-body">
                <div className="inventory-form-group">
                  <label className="inventory-form-label required">Supplier Name</label>
                  <input
                    type="text"
                    name="name"
                    value={supplierFormData.name}
                    onChange={handleSupplierInputChange}
                    className="inventory-form-input"
                    placeholder="e.g., ABC Wholesale Corp"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="inventory-form-group">
                    <label className="inventory-form-label">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={supplierFormData.contactPerson}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-input"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="inventory-form-group">
                    <label className="inventory-form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={supplierFormData.email}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-input"
                      placeholder="supplier@example.com"
                    />
                  </div>
                </div>

                <div className="inventory-form-group">
                  <label className="inventory-form-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={supplierFormData.phone}
                    onChange={handleSupplierInputChange}
                    className="inventory-form-input"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="inventory-form-group">
                  <label className="inventory-form-label">Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={supplierFormData.address.street}
                    onChange={handleSupplierInputChange}
                    className="inventory-form-input"
                    placeholder="123 Main St"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="inventory-form-group">
                    <label className="inventory-form-label">City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={supplierFormData.address.city}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-input"
                      placeholder="New York"
                    />
                  </div>

                  <div className="inventory-form-group">
                    <label className="inventory-form-label">State</label>
                    <input
                      type="text"
                      name="address.state"
                      value={supplierFormData.address.state}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-input"
                      placeholder="NY"
                    />
                  </div>

                  <div className="inventory-form-group">
                    <label className="inventory-form-label">Zip Code</label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={supplierFormData.address.zipCode}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-input"
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="inventory-form-group">
                    <label className="inventory-form-label">Payment Terms</label>
                    <select
                      name="paymentTerms"
                      value={supplierFormData.paymentTerms}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-select"
                    >
                      <option value="net-15">Net 15 Days</option>
                      <option value="net-30">Net 30 Days</option>
                      <option value="net-45">Net 45 Days</option>
                      <option value="net-60">Net 60 Days</option>
                      <option value="cod">Cash on Delivery</option>
                      <option value="prepaid">Prepaid</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="inventory-form-group">
                    <label className="inventory-form-label">Lead Time (Days)</label>
                    <input
                      type="number"
                      name="leadTimeDays"
                      value={supplierFormData.leadTimeDays}
                      onChange={handleSupplierInputChange}
                      className="inventory-form-input"
                      min="0"
                      placeholder="7"
                    />
                  </div>
                </div>

                <div className="inventory-form-group">
                  <label className="inventory-form-label">Notes</label>
                  <textarea
                    name="notes"
                    value={supplierFormData.notes}
                    onChange={handleSupplierInputChange}
                    className="inventory-form-textarea"
                    placeholder="Additional notes about this supplier..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="inventory-form-actions">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="inventory-btn inventory-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="inventory-btn inventory-btn-primary">
                  <Plus size={18} />
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
