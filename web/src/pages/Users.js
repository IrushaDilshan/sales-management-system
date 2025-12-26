import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', email: '', password: '', role: 'salesman' });
    const [error, setError] = useState(null);

    // Filter states
    const [filters, setFilters] = useState({
        role: 'all',
        shop: 'all',
        search: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

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
                role: user.role || 'salesman'
            });
        } else {
            setFormData({ id: null, name: '', email: '', password: '', role: 'salesman' });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', email: '', password: '', role: 'salesman' });
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
                    role: formData.role
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

                // Step 2: Create database user record (for role) - NO shop_id
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([{
                        id: authData.user.id, // Use same ID as auth user
                        name: formData.name,
                        email: formData.email,
                        role: formData.role
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
                alert(`User created successfully!\n\nLogin Credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease save these credentials. The user can now log in.\n\nTo assign this user to a shop, go to Shop Management and select them when adding/editing a shop.`);
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
                // First, try to delete from database
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Delete error:', error);
                    throw error;
                }

                // Then, try to delete the auth user (may fail if client-side)
                const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);

                if (authDeleteError) {
                    console.warn('Auth deletion warning:', authDeleteError);
                    alert(
                        'User deleted from database!\n\n' +
                        '⚠️ Note: The authentication account could not be deleted.\n' +
                        'This means the email cannot be reused immediately.\n\n' +
                        'To fully remove the user and allow email reuse,\n' +
                        'you need to delete the auth user from the Supabase Dashboard:\n' +
                        '1. Go to Supabase Dashboard\n' +
                        '2. Authentication → Users\n' +
                        '3. Find and delete the user manually\n\n' +
                        'User ID: ' + id
                    );
                } else {
                    alert('User deleted successfully! (Database + Auth)');
                }

                fetchUsers();
            } catch (err) {
                console.error('Error deleting user:', err);

                let errorMessage = 'Failed to delete user.\n\n';

                // Check for common errors
                if (err.message.includes('foreign key') || err.code === '23503') {
                    // Offer force delete option
                    const forceDelete = window.confirm(
                        'This user cannot be deleted because they have related data:\n' +
                        '- Sales requests\n' +
                        '- Daily income records\n' +
                        '- Stock transactions\n' +
                        '- Assigned routes\n\n' +
                        '⚠️ FORCE DELETE OPTION ⚠️\n\n' +
                        'Click OK to PERMANENTLY delete this user and ALL their related data.\n' +
                        'This action cannot be undone!\n\n' +
                        'Click Cancel to keep the user and their data.'
                    );

                    if (forceDelete) {
                        await handleForceDelete(id);
                    }
                } else {
                    errorMessage += 'Error: ' + (err.message || 'Unknown error');
                    alert(errorMessage);
                }
            }
        }
    };

    const handleForceDelete = async (userId) => {
        try {
            console.log('=== Starting force delete for user:', userId, '===');

            // Delete in order: children first, then parent

            // 1. Delete requests (salesman_id)
            console.log('1. Deleting requests...');
            const { error: reqError } = await supabase
                .from('requests')
                .delete()
                .eq('salesman_id', userId);
            if (reqError) {
                console.error('Error deleting requests:', reqError);
                throw new Error(`Failed to delete requests: ${reqError.message}`);
            }
            console.log('✓ Requests deleted');

            // 2. Skip daily income - it's linked to shops, not users
            console.log('2. Skipping daily income (linked to shops, not users)...');

            // 3. First, get routes owned by this user
            console.log('3. Finding routes owned by user...');
            const { data: userRoutes } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', userId);

            if (userRoutes && userRoutes.length > 0) {
                const routeIds = userRoutes.map(r => r.id);
                console.log(`Found ${routeIds.length} routes to clean up`);

                // 3a. Remove route references from shops
                console.log('3a. Removing route references from shops...');
                const { error: shopsUpdateError } = await supabase
                    .from('shops')
                    .update({ route_id: null })
                    .in('route_id', routeIds);
                if (shopsUpdateError) {
                    console.error('Error updating shops:', shopsUpdateError);
                }
                console.log('✓ Shop route references removed');
            }

            // 4. Delete routes where user is the rep
            console.log('4. Deleting routes...');
            const { error: routesError } = await supabase
                .from('routes')
                .delete()
                .eq('rep_id', userId);
            if (routesError) {
                console.error('Error deleting routes:', routesError);
                throw new Error(`Failed to delete routes: ${routesError.message}`);
            }
            console.log('✓ Routes deleted');

            // 5. Delete stock transactions (if table exists)
            console.log('5. Deleting stock transactions...');

            // Delete by user_id
            const { error: stockError1 } = await supabase
                .from('stock_transactions')
                .delete()
                .eq('user_id', userId);
            if (stockError1 && !stockError1.message.includes('does not exist')) {
                console.error('Error deleting stock transactions (user_id):', stockError1);
            }

            // Delete by rep_id
            const { error: stockError2 } = await supabase
                .from('stock_transactions')
                .delete()
                .eq('rep_id', userId);
            if (stockError2 && !stockError2.message.includes('does not exist')) {
                console.error('Error deleting stock transactions (rep_id):', stockError2);
            }

            console.log('✓ Stock transactions checked');

            // 6. Delete route assignments (if table exists)
            console.log('6. Deleting route assignments...');
            const { error: routeAssignError } = await supabase
                .from('route_assignments')
                .delete()
                .eq('user_id', userId);
            if (routeAssignError && !routeAssignError.message.includes('does not exist')) {
                console.error('Error deleting route assignments:', routeAssignError);
                // Don't throw - this table might not exist
            }
            console.log('✓ Route assignments checked');

            // 7. Delete the database user record
            console.log('7. Deleting user from database...');
            const { error: userError } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (userError) {
                console.error('Error deleting user:', userError);
                throw new Error(`Failed to delete user: ${userError.message}`);
            }
            console.log('✓ User deleted from database');

            // 8. Delete the auth user (so email can be reused)
            console.log('8. Deleting auth user...');
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
            if (authDeleteError) {
                console.warn('⚠ Warning: Could not delete auth user:', authDeleteError.message);
                console.warn('This is normal if using client-side deletion. The auth account may still exist.');
            } else {
                console.log('✓ Auth user deleted');
            }

            console.log('=== Force delete completed successfully ===');
            alert('✅ User and all related data deleted successfully!\n\nNote: If using client-side auth, the user may still be able to log in. Contact admin to fully remove auth account.');
            fetchUsers();

        } catch (error) {
            console.error('=== Force delete failed ===');
            console.error(error);
            alert('❌ Force delete failed:\n\n' + (error.message || 'Unknown error') + '\n\nPlease check the console for details.\n\nSome data may have been partially deleted.');
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
