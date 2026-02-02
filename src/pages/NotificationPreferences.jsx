import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  Save,
  CheckCircle,
  Send
} from 'lucide-react';
import { apiRequest } from '../services/api';
import '../components/Notifications.css';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Notification types configuration
  const notificationTypes = [
    {
      id: 'sales',
      label: 'Sales Notifications',
      description: 'Get notified about new sales, orders, and payments',
      icon: '💰',
      subTypes: [
        { id: 'new_order', label: 'New Orders', description: 'When a new order is placed' },
        { id: 'payment_received', label: 'Payment Received', description: 'When payment is received' },
        { id: 'order_completed', label: 'Order Completed', description: 'When an order is fulfilled' },
        { id: 'refund_processed', label: 'Refund Processed', description: 'When a refund is issued' }
      ]
    },
    {
      id: 'inventory',
      label: 'Inventory Notifications',
      description: 'Get notified about stock levels and inventory changes',
      icon: '📦',
      subTypes: [
        { id: 'low_stock', label: 'Low Stock Alert', description: 'When product stock is running low' },
        { id: 'out_of_stock', label: 'Out of Stock', description: 'When a product is out of stock' },
        { id: 'stock_updated', label: 'Stock Updated', description: 'When inventory is updated' },
        { id: 'new_product', label: 'New Product', description: 'When a new product is added' }
      ]
    },
    {
      id: 'system',
      label: 'System Notifications',
      description: 'Get notified about system updates and reports',
      icon: '⚙️',
      subTypes: [
        { id: 'daily_report', label: 'Daily Report', description: 'Daily sales and inventory report' },
        { id: 'weekly_report', label: 'Weekly Report', description: 'Weekly performance summary' },
        { id: 'system_update', label: 'System Updates', description: 'System updates and maintenance' },
        { id: 'backup_status', label: 'Backup Status', description: 'Database backup notifications' }
      ]
    }
  ];

  // Fetch user preferences
  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/notifications/preferences');
      setPreferences(response.preferences || {});
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Set default preferences on error
      const defaultPreferences = {};
      notificationTypes.forEach(type => {
        type.subTypes.forEach(subType => {
          defaultPreferences[subType.id] = {
            enabled: true,
            channels: {
              app: true,
              email: false,
              sms: false,
              push: false
            }
          };
        });
      });
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      await apiRequest('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences })
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      await apiRequest('/notifications/test', { method: 'POST' });

      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);

      alert('Test notification sent! Check your notification bell.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification. Please try again.');
    }
  };

  // Toggle notification type enabled/disabled
  const toggleNotificationType = (subTypeId) => {
    setPreferences(prev => ({
      ...prev,
      [subTypeId]: {
        ...prev[subTypeId],
        enabled: !prev[subTypeId]?.enabled
      }
    }));
  };

  // Toggle notification channel
  const toggleChannel = (subTypeId, channel) => {
    setPreferences(prev => ({
      ...prev,
      [subTypeId]: {
        ...prev[subTypeId],
        channels: {
          ...prev[subTypeId]?.channels,
          [channel]: !prev[subTypeId]?.channels?.[channel]
        }
      }
    }));
  };

  // Check if notification type is enabled
  const isEnabled = (subTypeId) => {
    return preferences[subTypeId]?.enabled ?? true;
  };

  // Check if channel is enabled
  const isChannelEnabled = (subTypeId, channel) => {
    return preferences[subTypeId]?.channels?.[channel] ?? false;
  };

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  if (loading) {
    return (
      <div className="notification-preferences">
        <div className="notification-loading">
          <div className="loading-spinner"></div>
          <p>Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-preferences">
      <div className="notification-preferences-header">
        <div className="notification-preferences-title">
          <Bell size={24} />
          <div>
            <h1>Notification Preferences</h1>
            <p>Manage how and when you receive notifications</p>
          </div>
        </div>

        <div className="notification-preferences-actions">
          <button
            className="notification-btn notification-btn-secondary"
            onClick={sendTestNotification}
            disabled={testNotificationSent}
          >
            <Send size={18} />
            {testNotificationSent ? 'Sent!' : 'Send Test'}
          </button>
          <button
            className="notification-btn notification-btn-primary"
            onClick={savePreferences}
            disabled={saving || saveSuccess}
          >
            {saving ? (
              <>
                <div className="loading-spinner-small"></div>
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle size={18} />
                Saved!
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="notification-preferences-body">
        <div className="notification-channel-legend">
          <h3>Notification Channels</h3>
          <div className="notification-channel-items">
            <div className="notification-channel-item">
              <Bell size={16} />
              <span>In-App</span>
            </div>
            <div className="notification-channel-item">
              <Mail size={16} />
              <span>Email</span>
            </div>
            <div className="notification-channel-item">
              <MessageSquare size={16} />
              <span>SMS</span>
            </div>
            <div className="notification-channel-item">
              <Smartphone size={16} />
              <span>Push</span>
            </div>
          </div>
        </div>

        {notificationTypes.map(type => (
          <div key={type.id} className="notification-preferences-section">
            <div className="notification-preferences-section-header">
              <div className="notification-preferences-section-title">
                <span className="notification-preferences-icon">{type.icon}</span>
                <div>
                  <h2>{type.label}</h2>
                  <p>{type.description}</p>
                </div>
              </div>
            </div>

            <div className="notification-preferences-list">
              {type.subTypes.map(subType => (
                <div key={subType.id} className="notification-preferences-item">
                  <div className="notification-preferences-item-info">
                    <div className="notification-preferences-item-header">
                      <label className="notification-toggle">
                        <input
                          type="checkbox"
                          checked={isEnabled(subType.id)}
                          onChange={() => toggleNotificationType(subType.id)}
                        />
                        <span className="notification-toggle-slider"></span>
                      </label>
                      <div>
                        <h3>{subType.label}</h3>
                        <p>{subType.description}</p>
                      </div>
                    </div>
                  </div>

                  {isEnabled(subType.id) && (
                    <div className="notification-preferences-channels">
                      <button
                        className={`notification-channel-btn ${isChannelEnabled(subType.id, 'app') ? 'active' : ''}`}
                        onClick={() => toggleChannel(subType.id, 'app')}
                        title="In-App Notifications"
                      >
                        <Bell size={18} />
                      </button>
                      <button
                        className={`notification-channel-btn ${isChannelEnabled(subType.id, 'email') ? 'active' : ''}`}
                        onClick={() => toggleChannel(subType.id, 'email')}
                        title="Email Notifications"
                      >
                        <Mail size={18} />
                      </button>
                      <button
                        className={`notification-channel-btn ${isChannelEnabled(subType.id, 'sms') ? 'active' : ''}`}
                        onClick={() => toggleChannel(subType.id, 'sms')}
                        title="SMS Notifications"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        className={`notification-channel-btn ${isChannelEnabled(subType.id, 'push') ? 'active' : ''}`}
                        onClick={() => toggleChannel(subType.id, 'push')}
                        title="Push Notifications"
                      >
                        <Smartphone size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="notification-preferences-info">
          <p>
            <strong>Note:</strong> Email and SMS notifications require additional configuration
            in your account settings. Push notifications require browser permission.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
