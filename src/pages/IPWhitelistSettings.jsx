/**
 * @fileoverview IP Whitelist Settings Page
 *
 * Manage IP whitelist for store access
 */

import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Globe, AlertTriangle, HelpCircle } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import './Settings.css';

function IPWhitelistSettings() {
    const { user } = useAuthStore();
    const [storeId, setStoreId] = useState(user?.storeId);
    const [ipWhitelist, setIpWhitelist] = useState([]);
    const [newIp, setNewIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        loadWhitelist();
    }, [storeId]);

    const loadWhitelist = async () => {
        try {
            setLoading(true);
            const data = await apiRequest(`/stores/${storeId}`);
            setIpWhitelist(data.store?.ipWhitelist || []);
        } catch (error) {
            console.error('Failed to load IP whitelist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIp = () => {
        if (!newIp.trim()) {
            return;
        }

        // Basic validation
        const ip = newIp.trim();
        if (!isValidIpEntry(ip)) {
            alert('Invalid IP format. Please enter a valid IP address, CIDR range, or wildcard pattern.');
            return;
        }

        if (ipWhitelist.includes(ip)) {
            alert('This IP is already in the whitelist');
            return;
        }

        setIpWhitelist([...ipWhitelist, ip]);
        setNewIp('');
    };

    const handleRemoveIp = (ip) => {
        if (confirm(`Remove ${ip} from whitelist?`)) {
            setIpWhitelist(ipWhitelist.filter(item => item !== ip));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiRequest(`/stores/${storeId}`, {
                method: 'PUT',
                body: JSON.stringify({ ipWhitelist })
            });

            alert('IP whitelist updated successfully');
            loadWhitelist();
        } catch (error) {
            console.error('Failed to save IP whitelist:', error);
            alert('Failed to save IP whitelist');
        } finally {
            setSaving(false);
        }
    };

    const isValidIpEntry = (entry) => {
        // IPv4 address
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        // CIDR notation
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        // Wildcard
        const wildcardRegex = /^(\d{1,3}\.|\*\.){3}(\d{1,3}|\*)$/;

        return ipv4Regex.test(entry) || cidrRegex.test(entry) || wildcardRegex.test(entry);
    };

    if (loading) {
        return (
            <div className="settings-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>IP Whitelist Settings</h1>
                <p>Restrict store access to specific IP addresses</p>
            </div>

            <div className="settings-card">
                <div className="settings-section">
                    <div className="section-header">
                        <Globe size={24} />
                        <div>
                            <h3>IP Access Control</h3>
                            <p>Only allow access from whitelisted IP addresses</p>
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowHelp(!showHelp)}
                        >
                            <HelpCircle size={16} />
                            Help
                        </button>
                    </div>

                    {showHelp && (
                        <div className="help-box">
                            <h4>How IP Whitelisting Works</h4>
                            <ul>
                                <li><strong>Empty whitelist:</strong> All IPs are allowed (default)</li>
                                <li><strong>With entries:</strong> Only whitelisted IPs can access the store</li>
                            </ul>
                            <h4>Supported Formats</h4>
                            <ul>
                                <li><strong>Single IP:</strong> 192.168.1.100</li>
                                <li><strong>CIDR Range:</strong> 192.168.1.0/24 (allows 192.168.1.0 - 192.168.1.255)</li>
                                <li><strong>Wildcard:</strong> 192.168.1.* (allows any IP in 192.168.1.x)</li>
                            </ul>
                        </div>
                    )}

                    {ipWhitelist.length === 0 && (
                        <div className="alert alert-warning">
                            <AlertTriangle size={20} />
                            <div>
                                <strong>Whitelist is empty</strong>
                                <p>All IP addresses are currently allowed. Add IPs to restrict access.</p>
                            </div>
                        </div>
                    )}

                    {/* Add IP Form */}
                    <div className="add-ip-form">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter IP address (e.g., 192.168.1.100 or 192.168.1.0/24)"
                            value={newIp}
                            onChange={(e) => setNewIp(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddIp();
                                }
                            }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleAddIp}
                        >
                            <Plus size={16} />
                            Add IP
                        </button>
                    </div>

                    {/* IP List */}
                    {ipWhitelist.length > 0 && (
                        <div className="ip-list">
                            <div className="list-header">
                                <span>Whitelisted IP Addresses ({ipWhitelist.length})</span>
                            </div>
                            {ipWhitelist.map((ip, index) => (
                                <div key={index} className="ip-item">
                                    <Shield size={16} className="ip-icon" />
                                    <code className="ip-address">{ip}</code>
                                    <button
                                        className="btn btn-icon btn-danger-ghost"
                                        onClick={() => handleRemoveIp(ip)}
                                        title="Remove IP"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="form-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    {/* Warning */}
                    <div className="alert alert-error">
                        <AlertTriangle size={20} />
                        <div>
                            <strong>Warning</strong>
                            <p>Be careful when adding IP restrictions. If you add your current IP and save, you may lock yourself out if your IP changes.</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .help-box {
                    background: var(--surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    margin-top: 1rem;
                }

                .help-box h4 {
                    margin: 0 0 0.75rem 0;
                    font-size: 0.9375rem;
                    color: var(--text-primary);
                }

                .help-box ul {
                    margin: 0;
                    padding-left: 1.5rem;
                }

                .help-box li {
                    margin: 0.5rem 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .add-ip-form {
                    display: flex;
                    gap: 1rem;
                    margin: 1.5rem 0;
                }

                .add-ip-form .form-control {
                    flex: 1;
                }

                .ip-list {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    margin: 1.5rem 0;
                }

                .list-header {
                    background: var(--surface);
                    padding: 0.75rem 1rem;
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    border-bottom: 1px solid var(--border-color);
                }

                .ip-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .ip-item:last-child {
                    border-bottom: none;
                }

                .ip-item:hover {
                    background: var(--surface);
                }

                .ip-icon {
                    color: var(--success-color);
                    flex-shrink: 0;
                }

                .ip-address {
                    flex: 1;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9375rem;
                    color: var(--text-primary);
                    padding: 0.25rem 0.5rem;
                    background: var(--surface);
                    border-radius: var(--radius-sm);
                }

                .btn-danger-ghost {
                    color: var(--error-color);
                }

                .btn-danger-ghost:hover {
                    background: rgba(239, 68, 68, 0.1);
                }
            `}</style>
        </div>
    );
}

export default IPWhitelistSettings;
