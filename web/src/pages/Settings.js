import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../shared/ModernPage.css';
import './Settings.css';

const Settings = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    // Form states
    const [profileData, setProfileData] = useState({ name: '' });
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);

            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;

            setUser(authUser);

            const { data, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (dbError) throw dbError;

            setUserData(data);
            setProfileData({ name: data.name || '' });

        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Failed to load user data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const { error: updateError } = await supabase
                .from('users')
                .update({ name: profileData.name })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setSuccess('Profile updated successfully!');
            fetchUserData();

        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            if (passwordData.newPassword !== passwordData.confirmPassword) {
                throw new Error('New passwords do not match');
            }

            if (passwordData.newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (updateError) throw updateError;

            setSuccess('Password changed successfully!');
            setPasswordData({ newPassword: '', confirmPassword: '' });

        } catch (err) {
            console.error('Error changing password:', err);
            setError(err.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            try {
                await supabase.auth.signOut();
                navigate('/login');
            } catch (err) {
                console.error('Error logging out:', err);
                alert('Failed to logout');
            }
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            {/* Header Section */}
            <div className="settings-header">
                <div className="settings-header-content">
                    <h1>Account Settings</h1>
                    <p>Manage your account preferences and security</p>
                </div>
            </div>

            {/* Alert Messages */}
            {error && (
                <div className="settings-alert alert-error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}
            {success && (
                <div className="settings-alert alert-success">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {success}
                </div>
            )}

            <div className="settings-container">
                {/* Sidebar Navigation */}
                <div className="settings-sidebar">
                    <button
                        className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>Profile</span>
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span>Security</span>
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>Account Info</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="settings-content">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <div className="section-header">
                                <h2>Profile Information</h2>
                                <p>Update your personal details</p>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="settings-form">
                                <div className="form-row">
                                    <label className="modern-label">
                                        Full Name
                                        <input
                                            type="text"
                                            className="modern-input"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            required
                                            placeholder="Enter your full name"
                                        />
                                    </label>
                                </div>
                                <div className="form-row">
                                    <label className="modern-label">
                                        Email Address
                                        <input
                                            type="email"
                                            className="modern-input"
                                            value={user?.email || ''}
                                            disabled
                                        />
                                        <span className="input-hint">Email cannot be changed</span>
                                    </label>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-modern-primary" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <div className="section-header">
                                <h2>Change Password</h2>
                                <p>Ensure your account is using a strong password</p>
                            </div>
                            <form onSubmit={handleChangePassword} className="settings-form">
                                <div className="form-row">
                                    <label className="modern-label">
                                        New Password
                                        <input
                                            type="password"
                                            className="modern-input"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            required
                                            minLength={6}
                                            placeholder="Enter new password"
                                        />
                                    </label>
                                </div>
                                <div className="form-row">
                                    <label className="modern-label">
                                        Confirm Password
                                        <input
                                            type="password"
                                            className="modern-input"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            required
                                            minLength={6}
                                            placeholder="Confirm new password"
                                        />
                                        <span className="input-hint">Minimum 6 characters required</span>
                                    </label>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-modern-primary" disabled={saving}>
                                        {saving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div className="settings-section">
                            <div className="section-header">
                                <h2>Account Information</h2>
                                <p>View your account details</p>
                            </div>
                            <div className="info-grid">
                                <div className="info-card">
                                    <div className="info-icon">
                                        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                    </div>
                                    <div className="info-details">
                                        <span className="info-label">Email</span>
                                        <span className="info-value">{user?.email}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="info-icon">
                                        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="info-details">
                                        <span className="info-label">Role</span>
                                        <span className="info-value role-badge-modern">{userData?.role}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="info-icon">
                                        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="info-details">
                                        <span className="info-label">Member Since</span>
                                        <span className="info-value">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="danger-zone">
                                <div className="danger-zone-header">
                                    <h3>Logout</h3>
                                    <p>Sign out from your current session</p>
                                </div>
                                <button onClick={handleLogout} className="btn-logout-modern">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
