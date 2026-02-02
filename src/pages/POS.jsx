/**
 * @fileoverview Point of Sale (POS) Terminal
 * 
 * This page provides the main sales terminal interface:
 * - Product grid with category filtering
 * - Shopping cart management
 * - Customer selection for order tracking
 * - Multiple payment methods (cash, card, credit)
 * - Credit payment with due date for buy-now-pay-later
 * - Receipt generation
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useEmployeeSession } from '../stores/employeeSessionStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import { salesSync, productSync } from '../services/sync';
import EmployeeLogin from '../components/EmployeeLogin';
import PINVerifyDialog from '../components/PINVerifyDialog';
import {
    ArrowLeft, Search, Plus, Minus, Trash2,
    CreditCard, Banknote, Receipt, X, Check,
    Package, User, UserPlus, Calendar, Clock, LogOut, Users
} from 'lucide-react';
import './POS.css';

function POS() {
    const { store, user } = useAuthStore();
    const cart = useCartStore();
    const { formatCurrency } = useCurrency();
    const {
        currentEmployee,
        currentClockEvent,
        switchEmployee,
        recordSale
    } = useEmployeeSession();

    // Product state
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Customer state
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerSelect, setShowCustomerSelect] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');

    // Payment state
    const [showPayment, setShowPayment] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSale, setLastSale] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountReceived, setAmountReceived] = useState('');

    // Credit payment state
    const [creditDueDate, setCreditDueDate] = useState('');
    const [creditNotes, setCreditNotes] = useState('');

    // Processing and error state
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Employee login modal
    const [showEmployeeLogin, setShowEmployeeLogin] = useState(false);
    // PIN verification for logout/switch
    const [showPINVerify, setShowPINVerify] = useState(false);

    /**
     * Load products, categories, customers, and current employee
     */
    useEffect(() => {
        loadData();
    }, [store?.id]);

    /**
     * Set default credit due date (30 days from now)
     */
    useEffect(() => {
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setCreditDueDate(defaultDue.toISOString().split('T')[0]);
    }, []);

    const loadData = async () => {
        if (!store?.id) return;

        const [productsData, categoriesData, customersData] = await Promise.all([
            db.products.where('storeId').equals(store.id).filter(p => p.isActive !== false).toArray(),
            db.categories.where('storeId').equals(store.id).toArray(),
            db.customers.where('storeId').equals(store.id).toArray()
        ]);

        setProducts(productsData);
        setCategories(categoriesData);
        setCustomers(customersData);
    };

    // Calculate totals
    const taxRate = store?.taxRate || 0;
    const subtotal = cart.getSubtotal();
    const discountAmount = cart.getDiscountAmount();
    const tax = cart.getTax(taxRate);
    const total = cart.getTotal(taxRate);

    /**
     * Filter products by search and category
     */
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.includes(searchQuery);
        const matchesCategory = selectedCategory === 'all' || product.categoryId === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    /**
     * Filter customers by search
     */
    const filteredCustomers = customers.filter(customer =>
        customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone?.includes(customerSearch)
    );

    /**
     * Get category color for product display
     */
    const getCategoryColor = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.color || '#6b7280';
    };

    /**
     * Open checkout modal
     */
    const handleCheckout = () => {
        if (cart.items.length === 0) return;
        setAmountReceived(total.toFixed(2));
        setError('');
        setShowPayment(true);
    };

    /**
     * Quick add customer during checkout
     */
    const handleQuickAddCustomer = async () => {
        const name = window.prompt('Enter customer name:');
        if (!name?.trim()) return;

        const phone = window.prompt('Enter phone number (optional):');

        try {
            const customerId = await db.customers.add({
                storeId: store.id,
                name: name.trim(),
                phone: phone?.trim() || '',
                email: '',
                address: '',
                notes: '',
                totalOrders: 0,
                totalSpent: 0,
                lastOrderDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            const newCustomer = await db.customers.get(customerId);
            setCustomers(prev => [...prev, newCustomer]);
            setSelectedCustomer(newCustomer);
            setShowCustomerSelect(false);
        } catch (error) {
            console.error('Failed to add customer:', error);
        }
    };

    /**
     * Process payment and create sale
     */
    const handlePayment = async () => {
        setIsProcessing(true);
        setError('');

        // Validate credit payment
        if (paymentMethod === 'credit') {
            if (!selectedCustomer) {
                setError('Please select a customer for credit purchases');
                setIsProcessing(false);
                return;
            }
            if (!creditDueDate) {
                setError('Please set a due date for credit payment');
                setIsProcessing(false);
                return;
            }
        }

        // Validate that all products have been synced to server
        const unsyncedProducts = cart.items.filter(item => !item.serverId);
        if (unsyncedProducts.length > 0) {
            setError(`Some products haven't been synced to the server yet. Please sync your data before completing the sale.`);
            setIsProcessing(false);
            return;
        }

        // Auto-sync customer if not synced yet
        if (selectedCustomer && !selectedCustomer.serverId) {
            try {
                setError('Syncing customer to server...');
                const { customerAPI } = await import('../services/api');

                // Create customer on server
                const serverCustomer = await customerAPI.create({
                    name: selectedCustomer.name,
                    phone: selectedCustomer.phone,
                    email: selectedCustomer.email,
                    address: selectedCustomer.address,
                    notes: selectedCustomer.notes
                });

                // Update local customer with serverId
                await db.customers.update(selectedCustomer.id, {
                    serverId: serverCustomer._id,
                    needsSync: false
                });

                // Update selectedCustomer with serverId
                setSelectedCustomer({
                    ...selectedCustomer,
                    serverId: serverCustomer._id
                });

                setError('');
                console.log('✓ Customer synced successfully');
            } catch (syncError) {
                console.error('Failed to sync customer:', syncError);
                setError(`Failed to sync customer to server. Please try again or proceed without a customer. Error: ${syncError.message || 'Unknown error'}`);
                setIsProcessing(false);
                return;
            }
        }

        // Create sale record using serverIds for products
        const saleData = {
            storeId: store.id,
            userId: user?.id || store.ownerId,
            customerId: selectedCustomer?.serverId || null,
            employeeId: currentEmployee?.serverId || currentEmployee?.id || null,
            shiftId: currentClockEvent?.serverId || currentClockEvent?.id || null,
            items: cart.items.map(item => ({
                productId: item.serverId, // Use MongoDB ObjectId
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            subtotal,
            discount: discountAmount,
            tax,
            total,
            paymentMethod,
            paymentStatus: paymentMethod === 'credit' ? 'pending' : 'paid',
            status: 'completed',
            createdAt: new Date().toISOString()
        };

        try {
            // Save sale and sync to MongoDB
            const result = await salesSync.create(saleData, store.id);
            const saleId = result.id;
            console.log('Sale created, synced:', result.synced);

            // If credit payment, create credit record
            if (paymentMethod === 'credit') {
                await db.credits.add({
                    storeId: store.id,
                    customerId: selectedCustomer.id,
                    saleId,
                    amount: total,
                    amountPaid: 0,
                    dueDate: creditDueDate,
                    status: 'pending',
                    notes: creditNotes,
                    createdAt: new Date().toISOString(),
                    paidAt: null
                });
            }

            // Update product quantities and sync to server
            for (const item of cart.items) {
                try {
                    // Use productSync.updateStock() for atomic inventory updates
                    // Negative quantity change to deduct from stock
                    await productSync.updateStock(item.productId, -item.quantity, 'sale');
                } catch (error) {
                    console.error(`Failed to update stock for ${item.name}:`, error);
                    // Continue with other items even if one fails
                }
            }

            // Update customer stats
            if (selectedCustomer) {
                await db.customers.update(selectedCustomer.id, {
                    totalOrders: (selectedCustomer.totalOrders || 0) + 1,
                    totalSpent: (selectedCustomer.totalSpent || 0) + total,
                    lastOrderDate: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            setLastSale({ ...saleData, id: saleId });
            setShowPayment(false);
            setShowReceipt(true);
            cart.clearCart();
            setSelectedCustomer(null);
            setCreditNotes('');
            loadData();
        } catch (error) {
            console.error('Failed to process sale:', error);

            // Show detailed error message to user
            let errorMessage = 'Failed to process sale. ';
            if (error.message) {
                errorMessage += error.message;
            } else if (typeof error === 'string') {
                errorMessage += error;
            } else {
                errorMessage += 'Please check your connection and try again.';
            }

            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const change = parseFloat(amountReceived) - total;

    return (
        <div className="pos">
            {/* Left Panel - Products */}
            <div className="pos-products">
                {/* Header */}
                <div className="pos-header">
                    <Link to="/dashboard" className="btn btn-ghost btn-icon">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="pos-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search products or scan barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Employee Badge */}
                    <div className="pos-employee-badge">
                        {currentEmployee ? (
                            <>
                                <div className="employee-info-badge">
                                    <User size={16} />
                                    <span>{currentEmployee.name}</span>
                                    {currentClockEvent && (
                                        <span className="clocked-in-badge">
                                            <Clock size={12} /> On Duty
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowPINVerify(true)}
                                    title="Switch Employee (PIN Required)"
                                >
                                    <Users size={16} /> Switch
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowEmployeeLogin(true)}
                            >
                                <User size={16} /> Employee Login
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="pos-categories">
                    <button
                        className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`category-btn ${selectedCategory === cat.id.toString() ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id.toString())}
                            style={{
                                '--cat-color': cat.color,
                                borderColor: selectedCategory === cat.id.toString() ? cat.color : 'transparent'
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div className="pos-products-grid">
                    {filteredProducts.length === 0 ? (
                        <div className="pos-empty">
                            <Package size={48} />
                            <p>No products found</p>
                        </div>
                    ) : (
                        filteredProducts.map(product => (
                            <button
                                key={product.id}
                                className="pos-product-card"
                                onClick={() => cart.addItem(product)}
                                disabled={product.quantity <= 0}
                            >
                                <div
                                    className="pos-product-image"
                                    style={{ backgroundColor: getCategoryColor(product.categoryId) + '20' }}
                                >
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} />
                                    ) : (
                                        <Package size={24} style={{ color: getCategoryColor(product.categoryId) }} />
                                    )}
                                </div>
                                <div className="pos-product-info">
                                    <span className="pos-product-name">{product.name}</span>
                                    <span className="pos-product-price">{formatCurrency(product.price)}</span>
                                </div>
                                {product.quantity <= 5 && product.quantity > 0 && (
                                    <span className="pos-product-stock">Only {product.quantity} left</span>
                                )}
                                {product.quantity <= 0 && (
                                    <span className="pos-product-out">Out of stock</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel - Cart */}
            <div className="pos-cart">
                <div className="cart-header">
                    <h2>Current Order</h2>
                    {cart.items.length > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={cart.clearCart}>
                            Clear
                        </button>
                    )}
                </div>

                {/* Customer Selection */}
                <div className="cart-customer">
                    {selectedCustomer ? (
                        <div className="selected-customer">
                            <User size={18} />
                            <span>{selectedCustomer.name}</span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setSelectedCustomer(null)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-secondary btn-sm w-full"
                            onClick={() => setShowCustomerSelect(true)}
                        >
                            <UserPlus size={16} /> Add Customer
                        </button>
                    )}
                </div>

                {cart.items.length === 0 ? (
                    <div className="cart-empty">
                        <Receipt size={48} />
                        <p>No items in cart</p>
                        <span>Tap products to add them</span>
                    </div>
                ) : (
                    <>
                        <div className="cart-items">
                            {cart.items.map(item => (
                                <div key={item.productId} className="cart-item">
                                    <div className="cart-item-info">
                                        <span className="cart-item-name">{item.name}</span>
                                        <span className="cart-item-price">{formatCurrency(item.price)}</span>
                                    </div>
                                    <div className="cart-item-controls">
                                        <button
                                            className="qty-btn"
                                            onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="cart-item-qty">{item.quantity}</span>
                                        <button
                                            className="qty-btn"
                                            onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            className="qty-btn delete"
                                            onClick={() => cart.removeItem(item.productId)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <span className="cart-item-total">
                                        {formatCurrency(item.price * item.quantity)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="cart-summary">
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="summary-row discount">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            {taxRate > 0 && (
                                <div className="summary-row">
                                    <span>Tax ({taxRate}%)</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                            )}
                            <div className="summary-row total">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg checkout-btn" onClick={handleCheckout}>
                            <CreditCard size={20} />
                            Charge {formatCurrency(total)}
                        </button>
                    </>
                )}
            </div>

            {/* Customer Selection Modal */}
            {showCustomerSelect && (
                <div className="modal-overlay" onClick={() => setShowCustomerSelect(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Select Customer</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCustomerSelect(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="customer-search-row">
                                <div className="pos-search">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search customers..."
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button className="btn btn-primary" onClick={handleQuickAddCustomer}>
                                    <Plus size={18} /> New
                                </button>
                            </div>
                            <div className="customer-list">
                                {filteredCustomers.length === 0 ? (
                                    <p className="text-secondary text-center p-4">No customers found</p>
                                ) : (
                                    filteredCustomers.map(customer => (
                                        <button
                                            key={customer.id}
                                            className="customer-option"
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setShowCustomerSelect(false);
                                            }}
                                        >
                                            <div className="customer-option-avatar">
                                                <User size={18} />
                                            </div>
                                            <div className="customer-option-info">
                                                <span className="customer-option-name">{customer.name}</span>
                                                {customer.phone && (
                                                    <span className="customer-option-phone">{customer.phone}</span>
                                                )}
                                            </div>
                                            <span className="customer-option-orders">
                                                {customer.totalOrders || 0} orders
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className="modal payment-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Payment</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => {
                                setShowPayment(false);
                                setError('');
                            }}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="alert alert-error" style={{ margin: '1rem', marginBottom: 0 }}>
                                <X size={16} />
                                <span>{error}</span>
                                <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    onClick={() => setError('')}
                                    style={{ marginLeft: 'auto' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <div className="modal-body">
                            <div className="payment-total">
                                <span>Total Amount</span>
                                <span className="payment-amount">{formatCurrency(total)}</span>
                            </div>

                            {selectedCustomer && (
                                <div className="payment-customer">
                                    <User size={16} />
                                    <span>Customer: <strong>{selectedCustomer.name}</strong></span>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setSelectedCustomer(null)}
                                        title="Remove customer from this sale"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="payment-methods">
                                <button
                                    className={`payment-method ${paymentMethod === 'cash' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('cash')}
                                >
                                    <Banknote size={24} />
                                    <span>Cash</span>
                                </button>
                                <button
                                    className={`payment-method ${paymentMethod === 'card' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('card')}
                                >
                                    <CreditCard size={24} />
                                    <span>Card</span>
                                </button>
                                <button
                                    className={`payment-method ${paymentMethod === 'credit' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('credit')}
                                >
                                    <Clock size={24} />
                                    <span>Credit</span>
                                </button>
                            </div>

                            {/* Cash payment - amount received */}
                            {paymentMethod === 'cash' && (
                                <div className="input-group">
                                    <label className="input-label">Amount Received</label>
                                    <input
                                        type="number"
                                        className="input payment-input"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        min={total}
                                        step="0.01"
                                    />
                                    {change > 0 && (
                                        <div className="change-display">
                                            Change: <strong>{formatCurrency(change)}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Credit payment - due date */}
                            {paymentMethod === 'credit' && (
                                <div className="credit-options">
                                    {!selectedCustomer && (
                                        <div className="credit-warning">
                                            <Clock size={16} />
                                            <span>Please select a customer for credit purchases</span>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => {
                                                    setShowPayment(false);
                                                    setShowCustomerSelect(true);
                                                }}
                                            >
                                                Select Customer
                                            </button>
                                        </div>
                                    )}
                                    <div className="input-group">
                                        <label className="input-label">
                                            <Calendar size={14} /> Payment Due Date
                                        </label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={creditDueDate}
                                            onChange={(e) => setCreditDueDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Notes (optional)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={creditNotes}
                                            onChange={(e) => setCreditNotes(e.target.value)}
                                            placeholder="e.g., Will pay on salary day"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-primary btn-lg w-full"
                                onClick={handlePayment}
                                disabled={
                                    isProcessing ||
                                    (paymentMethod === 'cash' && parseFloat(amountReceived) < total) ||
                                    (paymentMethod === 'credit' && !selectedCustomer)
                                }
                            >
                                <Check size={20} />
                                {isProcessing ? 'Processing...' : (paymentMethod === 'credit' ? 'Create Credit' : 'Complete Payment')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && lastSale && (
                <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
                    <div className="modal receipt-modal" onClick={e => e.stopPropagation()}>
                        <div className="receipt">
                            <div className="receipt-header">
                                <Check size={48} className="receipt-success" />
                                <h3>{lastSale.paymentMethod === 'credit' ? 'Credit Created!' : 'Payment Successful!'}</h3>
                            </div>

                            <div className="receipt-details">
                                <div className="receipt-store">
                                    <strong>{store?.name || 'Store'}</strong>
                                    <span>#{lastSale.id}</span>
                                    <span>{new Date(lastSale.createdAt).toLocaleString()}</span>
                                </div>

                                <div className="receipt-items">
                                    {lastSale.items.map((item, i) => (
                                        <div key={i} className="receipt-item">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="receipt-totals">
                                    <div className="receipt-row">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(lastSale.subtotal)}</span>
                                    </div>
                                    {lastSale.tax > 0 && (
                                        <div className="receipt-row">
                                            <span>Tax</span>
                                            <span>{formatCurrency(lastSale.tax)}</span>
                                        </div>
                                    )}
                                    <div className="receipt-row total">
                                        <span>Total</span>
                                        <span>{formatCurrency(lastSale.total)}</span>
                                    </div>
                                    <div className="receipt-row">
                                        <span>Payment ({lastSale.paymentMethod})</span>
                                        <span>
                                            {lastSale.paymentMethod === 'credit'
                                                ? `Due: ${creditDueDate}`
                                                : formatCurrency(lastSale.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-lg w-full"
                                onClick={() => setShowReceipt(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Login Modal */}
            {showEmployeeLogin && (
                <EmployeeLogin
                    onClose={() => setShowEmployeeLogin(false)}
                    onSuccess={(employee) => {
                        setShowEmployeeLogin(false);
                        console.log('Employee logged in:', employee.name);
                    }}
                />
            )}

            {/* PIN Verification for Logout/Switch */}
            {showPINVerify && (
                <PINVerifyDialog
                    title="Confirm Switch"
                    message={`Enter your PIN to switch out, ${currentEmployee?.name}`}
                    onCancel={() => setShowPINVerify(false)}
                    onSuccess={() => {
                        setShowPINVerify(false);
                        switchEmployee();
                    }}
                />
            )}
        </div>
    );
}

export default POS;
