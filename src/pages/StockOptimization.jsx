import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Package, DollarSign, AlertTriangle, TrendingDown,
  RefreshCw, BarChart3, Activity
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './Inventory.css';

/**
 * StockOptimization Component
 *
 * ABC Analysis dashboard for inventory optimization
 * Shows product categorization by value and identifies slow-moving items
 */
const StockOptimization = () => {
  const [abcAnalysis, setAbcAnalysis] = useState(null);
  const [slowMovers, setSlowMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [abcResponse, slowMoversResponse] = await Promise.all([
        apiRequest('/inventory/abc-analysis'),
        apiRequest('/inventory/slow-movers')
      ]);

      setAbcAnalysis(abcResponse);
      setSlowMovers(slowMoversResponse);
    } catch (error) {
      console.error('Failed to load optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getCategoryBadgeClass = (category) => {
    return `abc-category-badge category-${category.toLowerCase()}`;
  };

  // Filter products by selected category
  const getFilteredProducts = () => {
    if (!abcAnalysis) return [];
    if (selectedCategory === 'all') return abcAnalysis.products;
    return abcAnalysis.products.filter(p => p.category === selectedCategory.toUpperCase());
  };

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="inventory-loading">
          <div className="inventory-loading-spinner" />
          Loading optimization data...
        </div>
      </div>
    );
  }

  if (!abcAnalysis) {
    return (
      <div className="inventory-page">
        <div className="inventory-empty">
          <div className="inventory-empty-icon">📊</div>
          <h3 className="inventory-empty-title">No Data Available</h3>
          <p className="inventory-empty-message">
            Insufficient sales data to perform ABC analysis. Add products and sales to see optimization insights.
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
          <h1>Stock Optimization</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            ABC Analysis and inventory turnover insights
          </p>
        </div>
        <button
          onClick={loadData}
          className="inventory-btn inventory-btn-secondary"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* ABC Analysis Container */}
      <div className="abc-analysis-container">
        <div className="abc-analysis-header">
          <h2 className="abc-analysis-title">ABC Analysis</h2>
          <p className="abc-analysis-description">
            Products are categorized based on their contribution to total inventory value.
            Focus on Category A items for maximum impact on revenue.
          </p>
        </div>

        {/* ABC Category Cards */}
        <div className="abc-categories-grid">
          {/* Category A */}
          <div className="abc-category-card category-a">
            <div className="abc-category-label">A</div>
            <div className="abc-category-description">
              High Value - Focus Items
            </div>
            <div className="abc-category-stats">
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">Products</span>
                <span className="abc-category-stat-value">
                  {abcAnalysis.categoryA.count}
                </span>
              </div>
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">Total Value</span>
                <span className="abc-category-stat-value">
                  {formatCurrency(abcAnalysis.categoryA.totalValue)}
                </span>
              </div>
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">% of Total</span>
                <span className="abc-category-stat-value">
                  {formatPercent(abcAnalysis.categoryA.percentOfTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Category B */}
          <div className="abc-category-card category-b">
            <div className="abc-category-label">B</div>
            <div className="abc-category-description">
              Medium Value - Monitor
            </div>
            <div className="abc-category-stats">
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">Products</span>
                <span className="abc-category-stat-value">
                  {abcAnalysis.categoryB.count}
                </span>
              </div>
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">Total Value</span>
                <span className="abc-category-stat-value">
                  {formatCurrency(abcAnalysis.categoryB.totalValue)}
                </span>
              </div>
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">% of Total</span>
                <span className="abc-category-stat-value">
                  {formatPercent(abcAnalysis.categoryB.percentOfTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Category C */}
          <div className="abc-category-card category-c">
            <div className="abc-category-label">C</div>
            <div className="abc-category-description">
              Low Value - Optimize
            </div>
            <div className="abc-category-stats">
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">Products</span>
                <span className="abc-category-stat-value">
                  {abcAnalysis.categoryC.count}
                </span>
              </div>
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">Total Value</span>
                <span className="abc-category-stat-value">
                  {formatCurrency(abcAnalysis.categoryC.totalValue)}
                </span>
              </div>
              <div className="abc-category-stat">
                <span className="abc-category-stat-label">% of Total</span>
                <span className="abc-category-stat-value">
                  {formatPercent(abcAnalysis.categoryC.percentOfTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`inventory-btn inventory-btn-sm ${selectedCategory === 'all' ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
          >
            All Products ({abcAnalysis.products.length})
          </button>
          <button
            onClick={() => setSelectedCategory('a')}
            className={`inventory-btn inventory-btn-sm ${selectedCategory === 'a' ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
          >
            Category A ({abcAnalysis.categoryA.count})
          </button>
          <button
            onClick={() => setSelectedCategory('b')}
            className={`inventory-btn inventory-btn-sm ${selectedCategory === 'b' ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
          >
            Category B ({abcAnalysis.categoryB.count})
          </button>
          <button
            onClick={() => setSelectedCategory('c')}
            className={`inventory-btn inventory-btn-sm ${selectedCategory === 'c' ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
          >
            Category C ({abcAnalysis.categoryC.count})
          </button>
        </div>

        {/* Products Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="abc-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Sales (30d)</th>
                <th>Turnover Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No products in this category
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{product.productName}</div>
                    </td>
                    <td>{product.sku || '-'}</td>
                    <td>
                      <span className={getCategoryBadgeClass(product.category)}>
                        {product.category}
                      </span>
                    </td>
                    <td>{product.currentStock}</td>
                    <td>{formatCurrency(product.unitPrice)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrency(product.totalValue)}
                    </td>
                    <td>{product.salesLast30Days}</td>
                    <td>
                      {product.turnoverRate !== null ? (
                        <span style={{
                          color: product.turnoverRate > 0.5 ? 'var(--success-color)' :
                                 product.turnoverRate > 0.2 ? 'var(--warning-color)' :
                                 'var(--danger-color)'
                        }}>
                          {product.turnoverRate.toFixed(2)}x
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Turnover Stats */}
      {abcAnalysis.overallTurnoverRate !== undefined && (
        <div className="inventory-stats-grid" style={{ marginTop: '2rem' }}>
          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Overall Turnover Rate</p>
                <h3 className="inventory-stat-value">
                  {abcAnalysis.overallTurnoverRate.toFixed(2)}x
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  per 30 days
                </p>
              </div>
              <div className="inventory-stat-icon primary">
                <Activity size={24} />
              </div>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Total Inventory Value</p>
                <h3 className="inventory-stat-value">
                  {formatCurrency(abcAnalysis.totalInventoryValue)}
                </h3>
              </div>
              <div className="inventory-stat-icon success">
                <DollarSign size={24} />
              </div>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Total Products</p>
                <h3 className="inventory-stat-value">
                  {abcAnalysis.products.length}
                </h3>
              </div>
              <div className="inventory-stat-icon primary">
                <Package size={24} />
              </div>
            </div>
          </div>

          <div className="inventory-stat-card">
            <div className="inventory-stat-header">
              <div>
                <p className="inventory-stat-label">Slow Movers</p>
                <h3 className="inventory-stat-value">
                  {slowMovers.length}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  items to optimize
                </p>
              </div>
              <div className="inventory-stat-icon warning">
                <TrendingDown size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slow Moving Items Section */}
      {slowMovers.length > 0 && (
        <div style={{
          background: 'var(--card-background)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginTop: '2rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <TrendingDown size={20} style={{ color: 'var(--warning-color)' }} />
              Slow-Moving Items
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Products with low sales velocity that may need promotional attention or stock reduction.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="abc-products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Sales (30d)</th>
                  <th>Sales (90d)</th>
                  <th>Days on Hand</th>
                  <th>Turnover Rate</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {slowMovers.map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{product.productName}</div>
                    </td>
                    <td>{product.sku || '-'}</td>
                    <td>
                      <span style={{
                        color: product.currentStock > 50 ? 'var(--warning-color)' : 'inherit'
                      }}>
                        {product.currentStock}
                      </span>
                    </td>
                    <td>{product.salesLast30Days}</td>
                    <td>{product.salesLast90Days}</td>
                    <td>
                      <span style={{
                        color: product.daysOnHand > 90 ? 'var(--danger-color)' :
                               product.daysOnHand > 60 ? 'var(--warning-color)' :
                               'inherit'
                      }}>
                        {product.daysOnHand !== null ? product.daysOnHand : 'N/A'}
                      </span>
                    </td>
                    <td>
                      {product.turnoverRate !== null ? (
                        <span style={{ color: 'var(--danger-color)' }}>
                          {product.turnoverRate.toFixed(2)}x
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        {product.recommendation === 'reduce_stock' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--warning-color)',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <AlertTriangle size={12} />
                            Reduce Stock
                          </span>
                        )}
                        {product.recommendation === 'promote' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--info-color)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <TrendingUp size={12} />
                            Promote
                          </span>
                        )}
                        {product.recommendation === 'discontinue' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--danger-color)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <TrendingDown size={12} />
                            Discontinue
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimization Tips */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <BarChart3 size={20} style={{ color: 'var(--primary-color)' }} />
          Optimization Tips
        </h3>
        <ul style={{
          margin: 0,
          paddingLeft: '1.5rem',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          lineHeight: 1.8
        }}>
          <li>
            <strong>Category A:</strong> These items drive 80% of your value. Ensure they never go out of stock.
            Monitor closely and maintain optimal inventory levels.
          </li>
          <li>
            <strong>Category B:</strong> Medium-value items. Use moderate control and review periodically.
          </li>
          <li>
            <strong>Category C:</strong> Low-value items. Minimize carrying costs. Consider reducing stock or
            consolidating orders.
          </li>
          <li>
            <strong>Slow Movers:</strong> Products with low turnover rates. Consider promotions, bundling,
            or discontinuation to free up capital.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StockOptimization;
