/**
 * @fileoverview Customer Portal Orders Page
 *
 * View order history
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ChevronLeft } from 'lucide-react';
import { apiRequest } from '../../services/api';
import './PortalDashboard.css';

function PortalOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('customer_token');
            if (!token) {
                navigate('/portal/login');
                return;
            }

            const response = await apiRequest('/customer-portal/orders?limit=50', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setOrders(response.orders);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const viewOrderDetails = async (orderId) => {
        const token = localStorage.getItem('customer_token');
        const details = await apiRequest(`/customer-portal/orders/${orderId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        setSelectedOrder(details);
    };

    if (loading) {
        return (
            <div className="portal-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (selectedOrder) {
        return (
            <div className="portal-page">
                <div className="page-header">
                    <button className="btn btn-ghost" onClick={() => setSelectedOrder(null)}>
                        <ChevronLeft size={18} />
                        Back to Orders
                    </button>
                </div>

                <div className="order-details-card">
                    <h2>Order #{selectedOrder._id.slice(-8)}</h2>
                    <div className="order-meta">
                        <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                        <span className={`status-badge status-${selectedOrder.status}`}>
                            {selectedOrder.status}
                        </span>
                    </div>

                    <div className="items-list">
                        {selectedOrder.items.map((item, index) => (
                            <div key={index} className="item-row">
                                <div className="item-info">
                                    <div className="item-name">{item.productId?.name || item.name}</div>
                                    <div className="item-quantity">Qty: {item.quantity}</div>
                                </div>
                                <div className="item-price">${item.subtotal.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="order-summary">
                        <div className="summary-row">
                            <span>Subtotal:</span>
                            <span>${selectedOrder.subtotal.toFixed(2)}</span>
                        </div>
                        {selectedOrder.discount > 0 && (
                            <div className="summary-row">
                                <span>Discount:</span>
                                <span>-${selectedOrder.discount.toFixed(2)}</span>
                            </div>
                        )}
                        {selectedOrder.tax > 0 && (
                            <div className="summary-row">
                                <span>Tax:</span>
                                <span>${selectedOrder.tax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="summary-row total">
                            <span>Total:</span>
                            <span>${selectedOrder.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="payment-info">
                        <strong>Payment Method:</strong> {selectedOrder.paymentMethod}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="portal-page">
            <div className="page-header">
                <h1>Order History</h1>
                <Link to="/portal/dashboard" className="btn btn-ghost">
                    <ChevronLeft size={18} />
                    Dashboard
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <ShoppingBag size={64} />
                    <h3>No orders yet</h3>
                    <p>Your order history will appear here</p>
                </div>
            ) : (
                <div className="orders-grid">
                    {orders.map((order) => (
                        <div
                            key={order._id}
                            className="order-card"
                            onClick={() => viewOrderDetails(order._id)}
                        >
                            <div className="order-card-header">
                                <div className="order-id">#{order._id.slice(-8)}</div>
                                <div className={`status-badge status-${order.status}`}>
                                    {order.status}
                                </div>
                            </div>

                            <div className="order-date">
                                {new Date(order.createdAt).toLocaleDateString()}
                            </div>

                            <div className="order-summary-row">
                                <span>{order.items.length} items</span>
                                <strong>${order.total.toFixed(2)}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PortalOrders;
