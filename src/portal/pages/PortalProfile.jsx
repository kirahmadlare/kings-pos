/**
 * @fileoverview Customer Portal Profile Page
 *
 * View and edit customer profile
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ChevronLeft, Save } from 'lucide-react';
import { apiRequest } from '../../services/api';
import './PortalDashboard.css';

function PortalProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('customer_token');
            if (!token) {
                navigate('/portal/login');
                return;
            }

            const data = await apiRequest('/customer-portal/profile', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setProfile(data);
            setFormData({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || ''
            });
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            const token = localStorage.getItem('customer_token');
            await apiRequest('/customer-portal/profile', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            alert('Profile updated successfully!');
            setEditing(false);
            loadProfile();
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
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
                <h1>Profile</h1>
                <Link to="/portal/dashboard" className="btn btn-ghost">
                    <ChevronLeft size={18} />
                    Dashboard
                </Link>
            </div>

            <div className="profile-card">
                {!editing ? (
                    <>
                        <div className="profile-section">
                            <h3>Personal Information</h3>
                            <div className="profile-grid">
                                <div className="profile-item">
                                    <label>Name</label>
                                    <div>{profile?.name}</div>
                                </div>
                                <div className="profile-item">
                                    <label>Email</label>
                                    <div>{profile?.email}</div>
                                </div>
                                <div className="profile-item">
                                    <label>Phone</label>
                                    <div>{profile?.phone}</div>
                                </div>
                                <div className="profile-item">
                                    <label>Address</label>
                                    <div>{profile?.address || 'Not provided'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Account Information</h3>
                            <div className="profile-grid">
                                <div className="profile-item">
                                    <label>Member Since</label>
                                    <div>{new Date(profile?.joinedDate).toLocaleDateString()}</div>
                                </div>
                                <div className="profile-item">
                                    <label>Total Purchases</label>
                                    <div>{profile?.purchaseCount || 0}</div>
                                </div>
                                <div className="profile-item">
                                    <label>Total Spent</label>
                                    <div>${profile?.totalSpent?.toFixed(2) || '0.00'}</div>
                                </div>
                                <div className="profile-item">
                                    <label>Loyalty Points</label>
                                    <div>{profile?.loyaltyPoints || 0}</div>
                                </div>
                            </div>
                        </div>

                        {profile?.vipStatus && (
                            <div className="vip-badge">
                                <strong>VIP Customer</strong>
                                <p>You enjoy exclusive benefits</p>
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            onClick={() => setEditing(true)}
                        >
                            Edit Profile
                        </button>
                    </>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="profile-section">
                            <h3>Edit Profile</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phone *</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group form-full">
                                    <label>Address</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditing(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : (
                                    <>
                                        <Save size={16} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default PortalProfile;
