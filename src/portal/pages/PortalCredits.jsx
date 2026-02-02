/**
 * @fileoverview Customer Portal Credits Page
 *
 * View and pay credit balance
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, ChevronLeft, DollarSign } from 'lucide-react';
import { apiRequest } from '../../services/api';
import './PortalDashboard.css';

function PortalCredits() {
    const navigate = useNavigate();
    const [credits, setCredits] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentModal, setPaymentModal] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadCredits();
    }, []);

    const loadCredits = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('customer_token');
            if (!token) {
                navigate('/portal/login');
                return;
            }

            const response = await apiRequest('/customer-portal/credits', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setCredits(response.credits);
            setSummary({
                totalBalance: response.totalBalance,
                totalAmount: response.totalAmount,
                totalPaid: response.totalPaid
            });
        } catch (error) {
            console.error('Failed to load credits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();

        if (!paymentAmount || paymentAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            setProcessing(true);

            const token = localStorage.getItem('customer_token');
            await apiRequest(`/customer-portal/credits/${paymentModal.id}/pay`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(paymentAmount),
                    paymentMethod: 'online',
                    reference: `PORTAL-${Date.now()}`
                })
            });

            alert('Payment recorded successfully!');
            setPaymentModal(null);
            setPaymentAmount('');
            loadCredits();
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
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

    return (
        <div className="portal-page">
            <div className="page-header">
                <h1>Credits</h1>
                <Link to="/portal/dashboard" className="btn btn-ghost">
                    <ChevronLeft size={18} />
                    Dashboard
                </Link>
            </div>

            {/* Summary */}
            {summary && (
                <div className="credits-summary">
                    <div className="summary-card">
                        <div className="summary-label">Total Balance</div>
                        <div className="summary-value">${summary.totalBalance.toFixed(2)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Amount</div>
                        <div className="summary-value">${summary.totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Total Paid</div>
                        <div className="summary-value">${summary.totalPaid.toFixed(2)}</div>
                    </div>
                </div>
            )}

            {/* Credits List */}
            {credits.length === 0 ? (
                <div className="empty-state">
                    <CreditCard size={64} />
                    <h3>No credits</h3>
                    <p>You have no outstanding credits</p>
                </div>
            ) : (
                <div className="credits-list">
                    {credits.map((credit) => (
                        <div key={credit.id} className="credit-card">
                            <div className="credit-header">
                                <div>
                                    <div className="credit-amount">${credit.amount.toFixed(2)}</div>
                                    <div className="credit-date">
                                        {new Date(credit.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className={`status-badge status-${credit.status}`}>
                                    {credit.status}
                                </div>
                            </div>

                            <div className="credit-details">
                                <div className="detail-row">
                                    <span>Balance:</span>
                                    <strong>${credit.balance.toFixed(2)}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Paid:</span>
                                    <span>${credit.paidAmount.toFixed(2)}</span>
                                </div>
                                {credit.dueDate && (
                                    <div className="detail-row">
                                        <span>Due Date:</span>
                                        <span>{new Date(credit.dueDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {credit.payments.length > 0 && (
                                <div className="payments-history">
                                    <h4>Payment History</h4>
                                    {credit.payments.map((payment, index) => (
                                        <div key={index} className="payment-row">
                                            <span>{new Date(payment.date).toLocaleDateString()}</span>
                                            <span>${payment.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {credit.status !== 'paid' && (
                                <button
                                    className="btn btn-primary btn-block"
                                    onClick={() => setPaymentModal(credit)}
                                >
                                    <DollarSign size={16} />
                                    Make Payment
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {paymentModal && (
                <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Make Payment</h2>
                            <button className="btn-icon" onClick={() => setPaymentModal(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="payment-info-box">
                                <div>Credit Balance:</div>
                                <strong>${paymentModal.balance.toFixed(2)}</strong>
                            </div>

                            <form onSubmit={handlePayment}>
                                <div className="form-group">
                                    <label>Payment Amount</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0.01"
                                        max={paymentModal.balance}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setPaymentAmount(paymentModal.balance.toString())}
                                >
                                    Pay Full Balance
                                </button>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setPaymentModal(null)}
                                        disabled={processing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={processing}
                                    >
                                        {processing ? 'Processing...' : 'Submit Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PortalCredits;
