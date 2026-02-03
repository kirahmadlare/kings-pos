/**
 * @fileoverview Consolidated Reports
 *
 * Cross-store reporting and analytics
 */

import { useState, useEffect } from 'react';
import { Download, Calendar, Filter, FileText, TrendingUp } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../hooks/useCurrency';
import './ConsolidatedReports.css';

function ConsolidatedReports() {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [reportType, setReportType] = useState('sales');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const generateReport = async () => {
        try {
            setLoading(true);

            // Get user's organization
            const orgsResponse = await apiRequest('/organizations');

            if (orgsResponse && orgsResponse.length > 0) {
                const orgId = orgsResponse[0]._id;

                const reportData = await apiRequest(
                    `/organizations/${orgId}/reports?reportType=${reportType}&startDate=${startDate}&endDate=${endDate}`
                );

                setReport(reportData);
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        if (!report) return;

        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `consolidated-report-${reportType}-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="consolidated-reports">
            {/* Header */}
            <div className="reports-header">
                <div>
                    <h1>Consolidated Reports</h1>
                    <p className="subtitle">Generate cross-store reports and analytics</p>
                </div>
            </div>

            {/* Report Configuration */}
            <div className="report-config">
                <div className="config-card">
                    <h2>Report Configuration</h2>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Report Type</label>
                            <select
                                className="form-control"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                            >
                                <option value="sales">Sales Report</option>
                                <option value="inventory">Inventory Report</option>
                                <option value="customers">Customer Report</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>End Date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="config-actions">
                        <button
                            className="btn btn-primary"
                            onClick={generateReport}
                            disabled={loading}
                        >
                            <TrendingUp size={18} />
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>

                        {report && (
                            <button
                                className="btn btn-secondary"
                                onClick={exportReport}
                            >
                                <Download size={18} />
                                Export Report
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Results */}
            {report && (
                <div className="report-results">
                    {/* Report Header */}
                    <div className="result-header">
                        <div>
                            <h2>{report.organizationName}</h2>
                            <p className="report-meta">
                                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report •{' '}
                                {formatDate(report.dateRange.start)} - {formatDate(report.dateRange.end)} •{' '}
                                {report.storeCount} stores
                            </p>
                        </div>
                    </div>

                    {/* Sales Report */}
                    {reportType === 'sales' && report.salesByStore && (
                        <div className="report-section">
                            <h3>Sales by Store</h3>
                            <div className="report-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Store Name</th>
                                            <th>Revenue</th>
                                            <th>Transactions</th>
                                            <th>Avg Transaction</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.salesByStore.map((store) => (
                                            <tr key={store.storeId}>
                                                <td className="store-name">{store.storeName}</td>
                                                <td className="revenue">{formatCurrency(store.revenue)}</td>
                                                <td>{store.transactions}</td>
                                                <td>{formatCurrency(store.avgTransaction)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td className="revenue">
                                                <strong>
                                                    {formatCurrency(
                                                        report.salesByStore.reduce((sum, s) => sum + s.revenue, 0)
                                                    )}
                                                </strong>
                                            </td>
                                            <td>
                                                <strong>
                                                    {report.salesByStore.reduce((sum, s) => sum + s.transactions, 0)}
                                                </strong>
                                            </td>
                                            <td>-</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {report.dailyTrend && report.dailyTrend.length > 0 && (
                                <>
                                    <h3>Daily Sales Trend</h3>
                                    <div className="report-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Revenue</th>
                                                    <th>Transactions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.dailyTrend.map((day) => (
                                                    <tr key={day._id}>
                                                        <td>{formatDate(day._id)}</td>
                                                        <td className="revenue">{formatCurrency(day.revenue)}</td>
                                                        <td>{day.transactions}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Inventory Report */}
                    {reportType === 'inventory' && report.inventoryByStore && (
                        <div className="report-section">
                            <h3>Inventory by Store</h3>
                            <div className="report-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Store Name</th>
                                            <th>Total Products</th>
                                            <th>Low Stock</th>
                                            <th>Out of Stock</th>
                                            <th>Inventory Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.inventoryByStore.map((store) => (
                                            <tr key={store.storeId}>
                                                <td className="store-name">{store.storeName}</td>
                                                <td>{store.totalProducts}</td>
                                                <td className={store.lowStock > 0 ? 'warning' : ''}>
                                                    {store.lowStock}
                                                </td>
                                                <td className={store.outOfStock > 0 ? 'danger' : ''}>
                                                    {store.outOfStock}
                                                </td>
                                                <td className="revenue">{formatCurrency(store.totalValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td>
                                                <strong>
                                                    {report.inventoryByStore.reduce((sum, s) => sum + s.totalProducts, 0)}
                                                </strong>
                                            </td>
                                            <td>
                                                <strong>
                                                    {report.inventoryByStore.reduce((sum, s) => sum + s.lowStock, 0)}
                                                </strong>
                                            </td>
                                            <td>
                                                <strong>
                                                    {report.inventoryByStore.reduce((sum, s) => sum + s.outOfStock, 0)}
                                                </strong>
                                            </td>
                                            <td className="revenue">
                                                <strong>
                                                    {formatCurrency(
                                                        report.inventoryByStore.reduce((sum, s) => sum + s.totalValue, 0)
                                                    )}
                                                </strong>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Customer Report */}
                    {reportType === 'customers' && report.customersByStore && (
                        <div className="report-section">
                            <h3>Customers by Store</h3>
                            <div className="report-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Store Name</th>
                                            <th>Total Customers</th>
                                            <th>New Customers</th>
                                            <th>Top Customers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.customersByStore.map((store) => (
                                            <tr key={store.storeId}>
                                                <td className="store-name">{store.storeName}</td>
                                                <td>{store.totalCustomers}</td>
                                                <td>{store.newCustomers}</td>
                                                <td>{store.topCustomersCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td>
                                                <strong>
                                                    {report.customersByStore.reduce((sum, s) => sum + s.totalCustomers, 0)}
                                                </strong>
                                            </td>
                                            <td>
                                                <strong>
                                                    {report.customersByStore.reduce((sum, s) => sum + s.newCustomers, 0)}
                                                </strong>
                                            </td>
                                            <td>-</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!report && !loading && (
                <div className="empty-report">
                    <FileText size={64} />
                    <h3>No Report Generated</h3>
                    <p>Configure the report parameters above and click "Generate Report"</p>
                </div>
            )}
        </div>
    );
}

export default ConsolidatedReports;
