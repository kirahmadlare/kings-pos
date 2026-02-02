import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Check,
  X,
  Filter,
  Search,
  Trash2,
  CheckCircle,
  Circle
} from 'lucide-react';
import { apiRequest } from '../services/api';
import '../components/Notifications.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const notificationsPerPage = 20;

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: notificationsPerPage,
        filter: filter
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await apiRequest(`/notifications?${params.toString()}`);

      setNotifications(response.notifications || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Toggle notification read status
  const toggleRead = async (notificationId, currentStatus) => {
    try {
      const endpoint = currentStatus ? 'unread' : 'read';
      await apiRequest(`/notifications/${notificationId}/${endpoint}`, { method: 'PATCH' });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: !currentStatus } : n)
      );
    } catch (error) {
      console.error('Error toggling notification status:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await apiRequest(`/notifications/${notificationId}`, { method: 'DELETE' });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      sales: '💰',
      inventory: '📦',
      system: '⚙️'
    };
    return icons[type] || '🔔';
  };

  // Get type badge
  const getTypeBadge = (type) => {
    const badges = {
      sales: { label: 'Sales', className: 'badge-sales' },
      inventory: { label: 'Inventory', className: 'badge-inventory' },
      system: { label: 'System', className: 'badge-system' }
    };
    return badges[type] || { label: type, className: 'badge-default' };
  };

  // Fetch notifications on mount or when dependencies change
  useEffect(() => {
    fetchNotifications();
  }, [filter, currentPage]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchNotifications();
      } else {
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="notification-center">
      <div className="notification-center-header">
        <div className="notification-center-title">
          <Bell size={24} />
          <h1>Notification Center</h1>
        </div>

        <div className="notification-center-actions">
          <div className="notification-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="notification-center-filters">
        <button
          className={`notification-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`notification-filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
        <button
          className={`notification-filter-btn ${filter === 'sales' ? 'active' : ''}`}
          onClick={() => setFilter('sales')}
        >
          Sales
        </button>
        <button
          className={`notification-filter-btn ${filter === 'inventory' ? 'active' : ''}`}
          onClick={() => setFilter('inventory')}
        >
          Inventory
        </button>
        <button
          className={`notification-filter-btn ${filter === 'system' ? 'active' : ''}`}
          onClick={() => setFilter('system')}
        >
          System
        </button>
      </div>

      <div className="notification-center-body">
        {loading ? (
          <div className="notification-loading">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <BellOff size={64} />
            <h2>No notifications found</h2>
            <p>
              {searchQuery
                ? 'Try adjusting your search query'
                : filter === 'unread'
                ? "You're all caught up!"
                : 'No notifications to display'}
            </p>
          </div>
        ) : (
          <>
            <div className="notification-center-list">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-center-item ${!notification.read ? 'notification-unread' : ''}`}
                >
                  <div className="notification-center-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-center-item-content">
                    <div className="notification-center-item-header">
                      <h3>{notification.title}</h3>
                      <span className={`notification-type-badge ${getTypeBadge(notification.type).className}`}>
                        {getTypeBadge(notification.type).label}
                      </span>
                    </div>
                    <p className="notification-center-item-message">{notification.message}</p>
                    <span className="notification-center-item-time">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                  </div>

                  <div className="notification-center-item-actions">
                    <button
                      className="notification-action-btn"
                      onClick={() => toggleRead(notification.id, notification.read)}
                      aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
                      title={notification.read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {notification.read ? <Circle size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button
                      className="notification-action-btn notification-delete-btn"
                      onClick={() => deleteNotification(notification.id)}
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="notification-pagination">
                <button
                  className="notification-btn notification-btn-secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="notification-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="notification-btn notification-btn-secondary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
