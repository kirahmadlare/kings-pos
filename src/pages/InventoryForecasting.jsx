import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiRequest } from '../services/api';
import './Inventory.css';

/**
 * InventoryForecasting Component
 *
 * Displays demand forecasting for products using linear regression
 * Shows historical sales data and predicted future demand
 */
const InventoryForecasting = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [reorderPoint, setReorderPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadForecast();
      loadReorderPoint();
    }
  }, [selectedProduct, days]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/products');
      setProducts(response.filter(p => p.isActive));

      if (response.length > 0) {
        setSelectedProduct(response[0]._id);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async () => {
    if (!selectedProduct) return;

    try {
      setForecastLoading(true);
      const response = await apiRequest(`/inventory/forecast/${selectedProduct}?days=${days}`);
      setForecastData(response);
    } catch (error) {
      console.error('Failed to load forecast:', error);
      setForecastData(null);
    } finally {
      setForecastLoading(false);
    }
  };

  const loadReorderPoint = async () => {
    if (!selectedProduct) return;

    try {
      const response = await apiRequest(`/inventory/reorder-point/${selectedProduct}`);
      setReorderPoint(response);
    } catch (error) {
      console.error('Failed to load reorder point:', error);
      setReorderPoint(null);
    }
  };

  const handleRefresh = () => {
    loadForecast();
    loadReorderPoint();
  };

  const selectedProductData = products.find(p => p._id === selectedProduct);

  // Prepare chart data
  const chartData = forecastData
    ? [
        ...forecastData.historical.map(item => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          actual: item.quantity,
          type: 'historical'
        })),
        ...forecastData.forecast.map(item => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          predicted: item.quantity,
          type: 'forecast'
        }))
      ]
    : [];

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="inventory-loading">
          <div className="inventory-loading-spinner" />
          Loading products...
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="inventory-page">
        <div className="inventory-empty">
          <div className="inventory-empty-icon">📦</div>
          <h3 className="inventory-empty-title">No Products Found</h3>
          <p className="inventory-empty-message">
            Add products to your inventory to see demand forecasting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="inventory-header">
        <div>
          <h1>Demand Forecasting</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Predict future demand based on historical sales data
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inventory-btn inventory-btn-secondary"
          disabled={forecastLoading}
        >
          <RefreshCw size={18} className={forecastLoading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Product Selection */}
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label className="inventory-form-label">Select Product</label>
            <select
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="inventory-form-select"
            >
              {products.map(product => (
                <option key={product._id} value={product._id}>
                  {product.name} - {product.sku || 'N/A'} (Stock: {product.quantity})
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '200px' }}>
            <label className="inventory-form-label">Forecast Period</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="inventory-form-select"
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {selectedProductData && reorderPoint && (
        <div className="inventory-stats-grid">
          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Current Stock</p>
                <h3 className="inventory-stat-value">{selectedProductData.quantity}</h3>
              </div>
              <div className="inventory-stat-icon primary">
                <Package size={24} />
              </div>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Reorder Point</p>
                <h3 className="inventory-stat-value">{reorderPoint.reorderPoint}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {selectedProductData.quantity <= reorderPoint.reorderPoint ? '⚠️ Below threshold' : '✓ Sufficient'}
                </p>
              </div>
              <div className="inventory-stat-icon warning">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Avg Daily Sales</p>
                <h3 className="inventory-stat-value">{reorderPoint.avgDailySales.toFixed(1)}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  units per day
                </p>
              </div>
              <div className="inventory-stat-icon success">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Days Until Reorder</p>
                <h3 className="inventory-stat-value">
                  {Math.max(0, Math.floor((selectedProductData.quantity - reorderPoint.reorderPoint) / reorderPoint.avgDailySales))}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  days remaining
                </p>
              </div>
              <div className="inventory-stat-icon primary">
                <Calendar size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {forecastLoading ? (
        <div className="inventory-forecast-container">
          <div className="inventory-loading">
            <div className="inventory-loading-spinner" />
            Loading forecast data...
          </div>
        </div>
      ) : forecastData ? (
        <div className="inventory-forecast-container">
          <div className="inventory-forecast-header">
            <h3 className="inventory-forecast-title">Demand Forecast</h3>
          </div>

          <div className="inventory-forecast-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-secondary)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-background)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                  name="Actual Sales"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Predicted Demand"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="inventory-forecast-insights">
            <div className="inventory-forecast-insight">
              <div className="inventory-forecast-insight-label">Total Predicted Demand</div>
              <div className="inventory-forecast-insight-value">
                {forecastData.totalPredictedDemand}
              </div>
            </div>
            <div className="inventory-forecast-insight">
              <div className="inventory-forecast-insight-label">Average Predicted Daily</div>
              <div className="inventory-forecast-insight-value">
                {forecastData.avgPredictedDaily.toFixed(1)}
              </div>
            </div>
            <div className="inventory-forecast-insight">
              <div className="inventory-forecast-insight-label">Trend</div>
              <div className="inventory-forecast-insight-value">
                {forecastData.trend > 0 ? '📈 Growing' : forecastData.trend < 0 ? '📉 Declining' : '➡️ Stable'}
              </div>
            </div>
            {reorderPoint && (
              <div className="inventory-forecast-insight">
                <div className="inventory-forecast-insight-label">Recommended Order Qty</div>
                <div className="inventory-forecast-insight-value">
                  {reorderPoint.economicOrderQuantity}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="inventory-forecast-container">
          <div className="inventory-empty">
            <div className="inventory-empty-icon">📊</div>
            <h3 className="inventory-empty-title">No Forecast Data Available</h3>
            <p className="inventory-empty-message">
              Insufficient sales history to generate forecast. Product needs at least 7 days of sales data.
            </p>
          </div>
        </div>
      )}

      {/* Reorder Details */}
      {reorderPoint && (
        <div style={{
          background: 'var(--card-background)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginTop: '2rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Reorder Recommendations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Economic Order Quantity (EOQ)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reorderPoint.economicOrderQuantity} units
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Safety Stock
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reorderPoint.safetyStock} units
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Lead Time
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reorderPoint.leadTime} days
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryForecasting;
