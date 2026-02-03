/**
 * @fileoverview Customers Management Page
 * 
 * This page provides customer relationship management including:
 * - Customer list with search and filters
 * - Add/Edit customer information
 * - View customer order history
 * - Track customer credits (buy now, pay later)
 * - Credit payment notifications
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import { customerSync } from '../services/sync';
import {
    Users, Search, Plus, Edit2, Trash2, X, Save, Phone, Mail, MapPin,
    ShoppingBag, CreditCard, Calendar, AlertTriangle, Clock, Check,
    ChevronRight, DollarSign, History, User, Bell, Download
} from 'lucide-react';
import AdvancedSearchBar from '../components/AdvancedSearchBar';
import Pagination from '../components/Pagination';
import ExportModal from '../components/ExportModal';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import './Customers.css';

/**
 * Format date to readable string
 */
const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Calculate days until/since a date
 */
const getDaysFromNow = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

function Customers() {
    const { store } = useAuthStore();
    const { formatCurrency } = useCurrency();

    // State
    const [customers, setCustomers] = useState([]);
    const [credits, setCredits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'credits'

    // Modal states
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [selectedCredit, setSelectedCredit] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });
    const [paymentAmount, setPaymentAmount] = useState('');

    // Advanced search configuration
    const searchConfig = {
        searchFields: ['name', 'phone', 'email', 'address'],
        filterFields: {
            totalSpent: {
                label: 'Total Spent',
                type: 'range',
                min: 0
            },
            totalOrders: {
                label: 'Total Orders',
                type: 'range',
                min: 0
            },
            lastOrderDate: {
                label: 'Last Order Date',
                type: 'daterange'
            }
        },
        defaultSort: 'totalOrders',
        defaultOrder: 'desc',
        itemsPerPage: 20
    };

    const search = useAdvancedSearch(customers, searchConfig);

    /**
     * Load customers and credits on mount
     */
    useEffect(() => {
        if (store?.id) {
            loadData();
        }
    }, [store?.id]);

    /**
     * Fetch customers and credits from database
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load customers
            const customerList = await db.customers
                .where('storeId')
                .equals(store.id)
                .toArray();
            setCustomers(customerList.sort((a, b) =>
                (b.totalOrders || 0) - (a.totalOrders || 0)
            ));

            // Load active credits
            const creditList = await db.credits
                .where('storeId')
                .equals(store.id)
                .filter(c => c.status !== 'paid')
                .toArray();

            // Enrich credits with customer names
            const enrichedCredits = await Promise.all(
                creditList.map(async credit => {
                    const customer = await db.customers.get(credit.customerId);
                    return { ...credit, customerName: customer?.name || 'Unknown' };
                })
            );

            setCredits(enrichedCredits.sort((a, b) =>
                new Date(a.dueDate) - new Date(b.dueDate)
            ));
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
        setIsLoading(false);
    };

    /**
     * Open modal to add new customer
     */
    const handleAddCustomer = () => {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
        setShowCustomerModal(true);
    };

    /**
     * Open modal to edit existing customer
     */
    const handleEditCustomer = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            notes: customer.notes || ''
        });
        setShowCustomerModal(true);
    };

    /**
     * Save customer (add or update)
     */
    const handleSaveCustomer = async () => {
        if (!formData.name.trim()) return;

        try {
            if (editingCustomer) {
                // Update existing customer and sync to server
                const result = await customerSync.update(editingCustomer.id, {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
                console.log('Customer updated, synced:', result.synced);
            } else {
                // Add new customer and sync to server
                const customerData = {
                    ...formData,
                    totalOrders: 0,
                    totalSpent: 0,
                    lastOrderDate: null
                };
                const result = await customerSync.create(customerData, store.id);
                console.log('Customer created, synced:', result.synced);
            }
            setShowCustomerModal(false);
            await loadData();
        } catch (error) {
            console.error('Failed to save customer:', error);
        }
    };

    /**
     * Delete a customer
     */
    const handleDeleteCustomer = async (customerId) => {
        if (!window.confirm('Delete this customer? Their order history will be preserved.')) {
            return;
        }

        try {
            const result = await customerSync.delete(customerId);
            console.log('Customer deleted, synced:', result.synced);
            await loadData();
        } catch (error) {
            console.error('Failed to delete customer:', error);
        }
    };

    /**
     * View customer order history
     */
    const handleViewHistory = async (customer) => {
        setSelectedCustomer(customer);
        try {
            const orders = await db.sales
                .where('customerId')
                .equals(customer.id)
                .reverse()
                .sortBy('createdAt');
            setCustomerOrders(orders);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Failed to load order history:', error);
        }
    };

    /**
     * Open payment modal for a credit
     */
    const handleMakePayment = (credit) => {
        setSelectedCredit(credit);
        const remaining = credit.amount - (credit.amountPaid || 0);
        setPaymentAmount(remaining.toFixed(2));
        setShowPaymentModal(true);
    };

    /**
     * Process credit payment
     */
    const handleProcessPayment = async () => {
        if (!selectedCredit || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        const remaining = selectedCredit.amount - (selectedCredit.amountPaid || 0);

        if (amount <= 0 || amount > remaining) {
            alert('Invalid payment amount');
            return;
        }

        try {
            const newAmountPaid = (selectedCredit.amountPaid || 0) + amount;
            const isPaidInFull = newAmountPaid >= selectedCredit.amount;

            await db.credits.update(selectedCredit.id, {
                amountPaid: newAmountPaid,
                status: isPaidInFull ? 'paid' : 'partial',
                paidAt: isPaidInFull ? new Date().toISOString() : null
            });

            setShowPaymentModal(false);
            await loadData();
        } catch (error) {
            console.error('Failed to process payment:', error);
        }
    };

    /**
     * Get credit status badge
     */
    const getCreditStatus = (credit) => {
        const days = getDaysFromNow(credit.dueDate);
        if (days < 0) return { label: `${Math.abs(days)}d overdue`, class: 'badge-danger' };
        if (days === 0) return { label: 'Due today', class: 'badge-warning' };
        if (days <= 7) return { label: `Due in ${days}d`, class: 'badge-warning' };
        return { label: formatDate(credit.dueDate), class: 'badge-primary' };
    };

    /**
     * Count overdue credits
     */
    const overdueCount = credits.filter(c => getDaysFromNow(c.dueDate) < 0).length;
    const dueSoonCount = credits.filter(c => {
        const days = getDaysFromNow(c.dueDate);
        return days >= 0 && days <= 7;
    }).length;

    if (isLoading) {
        return (
            <div className="customers-loading">
                <span className="spinner spinner-lg" />
                <p>Loading customers...</p>
            </div>
        );
    }

    return (
        <div className="customers">
            {/* Header */}
            <div className="customers-header">
                <div className="header-left">
                    <h2><Users size={24} /> Customers</h2>
                    <div className="header-stats">
                        <span className="stat">{customers.length} customers</span>
                        {overdueCount > 0 && (
                            <span className="stat stat-danger">
                                <AlertTriangle size={14} /> {overdueCount} overdue
                            </span>
                        )}
                        {dueSoonCount > 0 && (
                            <span className="stat stat-warning">
                                <Clock size={14} /> {dueSoonCount} due soon
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
                        <Download size={18} /> Export
                    </button>
                    <button className="btn btn-primary" onClick={handleAddCustomer}>
                        <Plus size={18} /> Add Customer
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="customers-tabs">
                <button
                    className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    <Users size={18} /> All Customers
                </button>
                <button
                    className={`tab ${activeTab === 'credits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('credits')}
                >
                    <CreditCard size={18} /> Credits & Due Payments
                    {credits.length > 0 && (
                        <span className="tab-badge">{credits.length}</span>
                    )}
                </button>
            </div>

            {/* Advanced Search */}
            {activeTab === 'customers' && (
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
                            { value: 'name', label: 'Name' },
                            { value: 'totalOrders', label: 'Orders' },
                            { value: 'totalSpent', label: 'Total Spent' },
                            { value: 'lastOrderDate', label: 'Last Order' }
                        ]}
                        placeholder="Search customers by name, phone, email..."
                    />
                </div>
            )}

            {/* Customers List */}
            {activeTab === 'customers' && (
                <>
                <div className="customers-list">
                    {search.data.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} />
                            <h3>No customers found</h3>
                            <p>{customers.length === 0 ? 'Add your first customer to start tracking their orders' : 'Try adjusting your search or filters'}</p>
                            {customers.length === 0 && (
                                <button className="btn btn-primary" onClick={handleAddCustomer}>
                                    <Plus size={18} /> Add Customer
                                </button>
                            )}
                        </div>
                    ) : (
                        search.data.map(customer => (
                            <div key={customer.id} className="customer-card">
                                <div className="customer-avatar">
                                    <User size={24} />
                                </div>
                                <div className="customer-info">
                                    <h4>{customer.name}</h4>
                                    <div className="customer-details">
                                        {customer.phone && (
                                            <span><Phone size={14} /> {customer.phone}</span>
                                        )}
                                        {customer.email && (
                                            <span><Mail size={14} /> {customer.email}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="customer-stats">
                                    <div className="stat-item">
                                        <ShoppingBag size={16} />
                                        <span>{customer.totalOrders || 0} orders</span>
                                    </div>
                                    <div className="stat-item">
                                        <DollarSign size={16} />
                                        <span>{formatCurrency(customer.totalSpent)}</span>
                                    </div>
                                </div>
                                <div className="customer-actions">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleViewHistory(customer)}
                                    >
                                        <History size={16} /> History
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleEditCustomer(customer)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm text-danger"
                                        onClick={() => handleDeleteCustomer(customer.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
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

            {/* Credits List */}
            {activeTab === 'credits' && (
                <div className="credits-list">
                    {credits.length === 0 ? (
                        <div className="empty-state">
                            <CreditCard size={48} />
                            <h3>No pending credits</h3>
                            <p>Credit purchases will appear here when customers buy on credit</p>
                        </div>
                    ) : (
                        credits.map(credit => {
                            const status = getCreditStatus(credit);
                            const remaining = credit.amount - (credit.amountPaid || 0);
                            return (
                                <div key={credit.id} className={`credit-card ${getDaysFromNow(credit.dueDate) < 0 ? 'overdue' : ''}`}>
                                    <div className="credit-info">
                                        <h4>{credit.customerName}</h4>
                                        <p className="credit-amount">
                                            <strong>{formatCurrency(remaining)}</strong>
                                            {credit.amountPaid > 0 && (
                                                <span className="paid-note">
                                                    ({formatCurrency(credit.amountPaid)} paid)
                                                </span>
                                            )}
                                        </p>
                                        {credit.notes && (
                                            <p className="credit-notes">{credit.notes}</p>
                                        )}
                                    </div>
                                    <div className="credit-status">
                                        <span className={`badge ${status.class}`}>
                                            <Calendar size={12} /> {status.label}
                                        </span>
                                    </div>
                                    <div className="credit-actions">
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleMakePayment(credit)}
                                        >
                                            <DollarSign size={16} /> Receive Payment
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Add/Edit Customer Modal */}
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCustomerModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label className="input-label">Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Customer name"
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Phone</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="customer@email.com"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Address</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Street address"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Notes</label>
                                <textarea
                                    className="input"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Any notes about this customer..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveCustomer}>
                                <Save size={18} /> Save Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order History Modal */}
            {showHistoryModal && selectedCustomer && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <History size={20} /> Order History - {selectedCustomer.name}
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowHistoryModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {customerOrders.length === 0 ? (
                                <div className="empty-state-sm">
                                    <ShoppingBag size={32} />
                                    <p>No orders yet</p>
                                </div>
                            ) : (
                                <div className="order-history">
                                    {customerOrders.map(order => (
                                        <div key={order.id} className="order-item">
                                            <div className="order-date">
                                                {formatDate(order.createdAt)}
                                            </div>
                                            <div className="order-details">
                                                <p>{order.items?.length || 0} items</p>
                                                <span className={`badge ${order.paymentMethod === 'credit' ? 'badge-warning' : 'badge-success'}`}>
                                                    {order.paymentMethod}
                                                </span>
                                            </div>
                                            <div className="order-total">
                                                {formatCurrency(order.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedCredit && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <DollarSign size={20} /> Receive Payment
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPaymentModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="payment-info">
                                <p>Customer: <strong>{selectedCredit.customerName}</strong></p>
                                <p>Total Credit: <strong>{formatCurrency(selectedCredit.amount)}</strong></p>
                                <p>Already Paid: <strong>{formatCurrency(selectedCredit.amountPaid || 0)}</strong></p>
                                <p className="remaining">
                                    Remaining: <strong>{formatCurrency(selectedCredit.amount - (selectedCredit.amountPaid || 0))}</strong>
                                </p>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Payment Amount</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    min="0"
                                    max={selectedCredit.amount - (selectedCredit.amountPaid || 0)}
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-success" onClick={handleProcessPayment}>
                                <Check size={18} /> Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                entityType="customers"
                entityName="Customers"
                availableColumns={[
                    { key: 'name', label: 'Customer Name' },
                    { key: 'phone', label: 'Phone Number' },
                    { key: 'email', label: 'Email Address' },
                    { key: 'address', label: 'Address' },
                    { key: 'totalSpent', label: 'Total Spent' },
                    { key: 'totalOrders', label: 'Total Orders' },
                    { key: 'lastVisit', label: 'Last Visit' },
                    { key: 'createdAt', label: 'Registration Date' },
                    { key: 'notes', label: 'Notes' }
                ]}
                currentFilters={search.filters}
                endpoint="/export/customers"
            />
        </div>
    );
}

export default Customers;
