import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', email: '', password: '', role: 'salesman', shop_id: '' });
    const [error, setError] = useState(null);

    // Filter states
    const [filters, setFilters] = useState({
        role: 'all',
        shop: 'all',
        search: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchShops();
    }, []);

    const fetchShops = async () => {
        try {
            const { data, error } = await supabase
                .from('shops')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setShops(data || []);
        } catch (err) {
            console.error('Error fetching shops:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            // Fetch shop names for each user
            const usersWithShops = await Promise.all(
                (data || []).map(async (user) => {
                    if (user.shop_id) {
                        const { data: shop } = await supabase
                            .from('shops')
                            .select('name')
                            .eq('id', user.shop_id)
                            .single();
                        return { ...user, shopName: shop?.name || null };
                    }
                    return { ...user, shopName: null };
                })
            );

            setUsers(usersWithShops);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name || '',
                email: user.email || '',
                password: '', // Never show password
                role: user.role || 'salesman',
                shop_id: user.shop_id || ''
            });
        } else {
            setFormData({ id: null, name: '', email: '', password: '', role: 'salesman', shop_id: '' });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', email: '', password: '', role: 'salesman', shop_id: '' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) {
                // UPDATING existing user - only update database
                const updates = {
                    name: formData.name,
                    role: formData.role,
                    shop_id: formData.shop_id || null
                };

                const { error: updateError } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', formData.id);

                if (updateError) throw updateError;
            } else {
                // CREATING new user - create auth account AND database record

                // Validate password
                if (!formData.password || formData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }

                // Step 1: Create auth user (for login) with email confirmation disabled
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        emailRedirectTo: undefined,
                        data: {
                            name: formData.name,
                            email_confirmed: true
                        }
                    }
                });

                if (authError) throw authError;

                if (!authData.user) {
                    throw new Error('Failed to create user account');
                }

                // Step 2: Create database user record (for role/shop)
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([{
                        id: authData.user.id, // Use same ID as auth user
                        name: formData.name,
                        email: formData.email,
                        role: formData.role,
                        shop_id: formData.shop_id || null
                    }]);

                if (dbError) {
                    console.error('Database insert failed:', dbError);
                    throw new Error('User created in auth but failed to save to database. Error: ' + dbError.message);
                }
            }

            fetchUsers();
            handleCloseModal();

            if (formData.id) {
                alert('User updated successfully!');
            } else {
                alert(`User created successfully!\n\nLogin Credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease save these credentials. The user can now log in.`);
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        }
    };

    const handleResetPassword = async (userId, userEmail) => {
        const confirmReset = window.confirm(
            `Send password reset email to:\n${userEmail}\n\n` +
            `The user will receive an email with a link to reset their password.\n\n` +
            `Click OK to send the email.`
        );

        if (!confirmReset) return;

        try {
            // Send password reset email (this works from client-side)
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                userEmail,
                {
                    redirectTo: `${window.location.origin}/login`
                }
            );

            if (resetError) throw resetError;

            alert(
                `Password reset email sent successfully!\n\n` +
                `The user will receive an email at:\n${userEmail}\n\n` +
                `They can click the link in the email to set a new password.`
            );
        } catch (err) {
            console.error('Error sending password reset:', err);
            alert('Failed to send password reset email: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?\n\nWarning: This cannot be undone and may fail if the user has related data (requests, transactions, etc.)')) {
            try {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Delete error:', error);
                    throw error;
                }

                alert('User deleted successfully!');
                fetchUsers();
            } catch (err) {
                console.error('Error deleting user:', err);

                let errorMessage = 'Failed to delete user.\n\n';

                // Check for common errors
                if (err.message.includes('foreign key') || err.code === '23503') {
                    errorMessage += 'This user cannot be deleted because they have related data:\n' +
                        '- Sales requests\n' +
                        '- Daily income records\n' +
                        '- Stock transactions\n' +
                        '- Assigned routes\n\n' +
                        'Please delete or reassign their data first, or deactivate the user instead.';
                } else {
                    errorMessage += 'Error: ' + (err.message || 'Unknown error');
                }

                alert(errorMessage);
            }
        }
    };

    // Filter users based on selected filters
    const getFilteredUsers = () => {
        return users.filter(user => {
            // Filter by role
            if (filters.role !== 'all' && user.role !== filters.role) {
                return false;
            }

            // Filter by shop assignment
            if (filters.shop === 'assigned' && !user.shop_id) {
                return false;
            }
            if (filters.shop === 'unassigned' && user.shop_id) {
                return false;
            }

            // Filter by search query
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesName = user.name?.toLowerCase().includes(searchLower);
                const matchesEmail = user.email?.toLowerCase().includes(searchLower);
                const matchesShop = user.shopName?.toLowerCase().includes(searchLower);

                if (!matchesName && !matchesEmail && !matchesShop) {
                    return false;
                }
            }

            return true;
        });
    };

    const filteredUsers = getFilteredUsers();

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">User Management</h1>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add User
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <>
                    {/* FILTER CONTROLS */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr auto',
                            gap: '1rem',
                            alignItems: 'end'
                        }}>
                            {/* Search */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Search
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or shop..."
                                    className="form-input"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Role Filter */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Filter by Role
                                </label>
                                <select
                                    className="form-select"
                                    value={filters.role}
                                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="salesman">Salesman</option>
                                    <option value="rep">Representative</option>
                                    <option value="storekeeper">Storekeeper</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {/* Shop Filter */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Shop Status
                                </label>
                                <select
                                    className="form-select"
                                    value={filters.shop}
                                    onChange={(e) => setFilters({ ...filters, shop: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="all">All Users</option>
                                    <option value="assigned">Has Shop</option>
                                    <option value="unassigned">No Shop</option>
                                </select>
                            </div>

                            {/* Clear Filters */}
                            <div>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setFilters({ role: 'all', shop: 'all', search: '' })}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div style={{
                            marginTop: '1rem',
                            fontSize: '0.9rem',
                            color: '#6B7280',
                            fontWeight: '500'
                        }}>
                            Showing {filteredUsers.length} of {users.length} users
                        </div>
                    </div>

                    <div className="table-container">
                        {filteredUsers.length === 0 ? (
                            <div className="empty-state">
                                <h3>No users found</h3>
                                <p>Click "Add User" to create your first user.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Password</th>
                                        <th>Assigned Shop</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id || Math.random()}>
                                            <td>{user.name}</td>
                                            <td><span style={{ color: '#666', fontSize: '0.9rem' }}>{user.email || 'N/A'}</span></td>
                                            <td>
                                                <span className="status-badge status-active">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#999', fontSize: '0.9rem' }}>••••••••</span>
                                                    <button
                                                        className="action-btn"
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            padding: '4px 12px',
                                                            background: '#f59e0b',
                                                            color: 'white',
                                                            borderRadius: '6px',
                                                            fontWeight: '600'
                                                        }}
                                                        onClick={() => handleResetPassword(user.id, user.email)}
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ color: user.shopName ? '#2196F3' : '#999', fontWeight: user.shopName ? '600' : 'normal' }}>
                                                    {user.shopName || 'No shop assigned'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-btn btn-edit" onClick={() => handleOpenModal(user)}>
                                                    Edit
                                                </button>
                                                <button className="action-btn btn-delete" onClick={() => handleDelete(user.id)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit User' : 'Add New User'}
                        </h2>

                        {error && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="john@example.com"
                                    disabled={formData.id !== null}
                                />
                                {formData.id && (
                                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                        Email cannot be changed after creation
                                    </small>
                                )}
                            </div>

                            {!formData.id && (
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Minimum 6 characters"
                                        minLength={6}
                                    />
                                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                        User will use this password to log in to the mobile app
                                    </small>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-select"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                >
                                    <option value="salesman">Salesman</option>
                                    <option value="rep">Representative</option>
                                    <option value="storekeeper">Store Keeper</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {/* Only show shop assignment for salesman role */}
                            {formData.role === 'salesman' && (
                                <div className="form-group">
                                    <label className="form-label">Assign Shop (Required for Salesman)</label>
                                    <select
                                        className="form-select"
                                        name="shop_id"
                                        value={formData.shop_id}
                                        onChange={handleInputChange}
                                        required={formData.role === 'salesman'}
                                    >
                                        <option value="">Select Shop</option>
                                        {shops.map(shop => (
                                            <option key={shop.id} value={shop.id}>{shop.name}</option>
                                        ))}
                                    </select>
                                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                        Salesman will only see data from their assigned shop
                                    </small>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
