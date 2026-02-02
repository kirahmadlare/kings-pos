import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import socketManager from '../services/socket';
import './Notifications.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/notifications?limit=5&sort=-createdAt');

      // API returns { notifications: [], ... } not array directly
      const notificationsList = response.notifications || [];

      const previousUnreadCount = unreadCount;
      const newUnreadCount = notificationsList.filter(n => !n.read).length;

      setNotifications(notificationsList);
      setUnreadCount(newUnreadCount);

      // Trigger animation if new notifications arrived
      if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
        setHasNewNotification(true);
        playNotificationSound();
        setTimeout(() => setHasNewNotification(false), 3000);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty notifications on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if sound file doesn't exist
      });
    } catch (error) {
      // Ignore sound errors
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifTime.toLocaleDateString();
  };

  // Get notification type badge
  const getTypeBadge = (type) => {
    const badges = {
      sales: { label: 'Sales', className: 'badge-sales' },
      inventory: { label: 'Inventory', className: 'badge-inventory' },
      system: { label: 'System', className: 'badge-system' }
    };
    return badges[type] || { label: type, className: 'badge-default' };
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [unreadCount]);

  // Subscribe to real-time notification events
  useEffect(() => {
    // Handler for new notifications
    const handleNewNotification = (notification) => {
      console.log('New notification received:', notification);

      // Add to notifications list
      setNotifications(prev => [notification, ...prev].slice(0, 5));
      setUnreadCount(prev => prev + 1);

      // Trigger animation
      setHasNewNotification(true);
      playNotificationSound();
      setTimeout(() => setHasNewNotification(false), 3000);
    };

    // Handler for notification updated
    const handleNotificationUpdated = (update) => {
      console.log('Notification updated:', update);
      setNotifications(prev =>
        prev.map(n => n.id === update.id ? { ...n, ...update } : n)
      );
      if (update.read === true) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else if (update.read === false) {
        setUnreadCount(prev => prev + 1);
      }
    };

    // Handler for all read
    const handleAllRead = () => {
      console.log('All notifications marked as read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    // Handler for deleted notification
    const handleNotificationDeleted = ({ id }) => {
      console.log('Notification deleted:', id);
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id);
        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== id);
      });
    };

    // Subscribe to events
    socketManager.on('notification:new', handleNewNotification);
    socketManager.on('notification:updated', handleNotificationUpdated);
    socketManager.on('notification:all-read', handleAllRead);
    socketManager.on('notification:deleted', handleNotificationDeleted);

    // Cleanup on unmount
    return () => {
      socketManager.off('notification:new', handleNewNotification);
      socketManager.off('notification:updated', handleNotificationUpdated);
      socketManager.off('notification:all-read', handleAllRead);
      socketManager.off('notification:deleted', handleNotificationDeleted);
    };
  }, []);

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className={`notification-bell-button ${hasNewNotification ? 'notification-pulse' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-btn notification-btn-text"
                onClick={markAllAsRead}
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {loading ? (
              <div className="notification-loading">
                <div className="loading-spinner"></div>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={48} />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'notification-unread' : ''}`}
                  >
                    <div className="notification-item-content">
                      <div className="notification-item-header">
                        <span className={`notification-type-badge ${getTypeBadge(notification.type).className}`}>
                          {getTypeBadge(notification.type).label}
                        </span>
                        <span className="notification-time">{formatTimestamp(notification.createdAt)}</span>
                      </div>
                      <h4 className="notification-item-title">{notification.title}</h4>
                      <p className="notification-item-message">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <button
                        className="notification-item-action"
                        onClick={() => markAsRead(notification.id)}
                        aria-label="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notification-dropdown-footer">
            <Link to="/notifications" className="notification-view-all">
              View all notifications
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
