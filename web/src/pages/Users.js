import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import Swal from 'sweetalert2';
import '../shared/ModernPage.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'salesman'
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

    useEffect(() => {
        fetchUsers();

        // Realtime subscription
        const userSubscription = supabase
            .channel('public:users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
                console.log('Realtime change received:', payload);
                fetchUsers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(userSubscription);
        };
    }, []);

    const fetchUsers = async () => {
        try {
            // Don't set global loading true on refresh to avoid UI flicker
            // Only set if users list is empty
            if (users.length === 0) setLoading(true);

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false }); // Show newest first

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            // Don't show error on silent refresh failure
            if (loading) setError('Failed to load personnel registry.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setCurrentUser(user);
            setFormData({
                name: user.name,
                email: user.email || '',
                role: (user.role === 'pending' || user.role === 'archived') ? 'salesman' : user.role // Default to salesman if pending or archived
            });
        } else {
            setCurrentUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'salesman'
            });
        }
        setIsModalOpen(true);
        // If we are opening the edit modal from the pending list, close the pending list
        if (isPendingModalOpen) setIsPendingModalOpen(false);
        setError(null);
        setSuccess(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            if (currentUser) {
                const { data, error } = await supabase
                    .from('users')
                    .update({
                        name: formData.name,
                        role: formData.role
                    })
                    .eq('id', currentUser.id)
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) {
                    throw new Error("Action denied. You do not have permission to modify this record or RLS policies blocked the update.");
                }
                setSuccess('Personnel profile updated successfully.');
            } else {
                const { error } = await supabase
                    .from('users')
                    .insert([{
                        name: formData.name,
                        role: formData.role
                    }]);

                if (error) throw error;
                setSuccess('New personnel entry initialized.');
            }

            fetchUsers();
            handleCloseModal();
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.message || 'Registry update failed.');
        }
    };

    const handleDeleteUser = async (id, isReject = false) => {
        const result = await Swal.fire({
            title: isReject ? 'Reject Request?' : 'Revoke Access?',
            text: isReject ? 'Reject and delete this request?' : 'Strike this individual from the active personnel registry?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: isReject ? 'Yes, reject' : 'Yes, revoke'
        });
        
        if (!result.isConfirmed) return;

        try {
            // Soft delete by updating the role to 'archived'
            const { data, error } = await supabase
                .from('users')
                .update({ role: 'archived' })
                .eq('id', id)
                .select();

            if (error) throw error;
            
            // Check if RLS or other constraints silently prevented the update
            if (!data || data.length === 0) {
                throw new Error("Action denied. You do not have permission to modify this record.");
            }

            setSuccess('Personnel entry successfully archived and access revoked.');
            fetchUsers();
        } catch (err) {
            console.error('Archive error:', err);
            setError('Failed to archive personnel entry. ' + (err.message || ''));
        }
    };

    const handleRestoreAccess = async (user) => {
        const result = await Swal.fire({
            title: 'Restore Access?',
            text: `Restore ${user.name} as a Salesman? You can edit their specific role afterwards.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Restore'
        });
        
        if (!result.isConfirmed) return;

        try {
            const { data, error } = await supabase
                .from('users')
                .update({ role: 'salesman' })
                .eq('id', user.id)
                .select();

            if (error) throw error;
            
            if (!data || data.length === 0) {
                throw new Error("Action denied. You do not have permission to modify this record.");
            }

            setSuccess('Personnel access restored successfully.');
            fetchUsers();
        } catch (err) {
            console.error('Restore error:', err);
            setError('Failed to restore access. ' + (err.message || ''));
        }
    };

    const handleHardDeleteUser = async (id, email) => {
        const result = await Swal.fire({
            title: 'WARNING: WIPE USER?',
            html: `This will completely destroy this user and free up their email (<b>${email}</b>) for re-registration. It cannot be undone.<br/><br/>Type "<b>DELETE</b>" to confirm:`,
            icon: 'error',
            input: 'text',
            inputPlaceholder: 'DELETE',
            showCancelButton: true,
            confirmButtonText: 'Wipe User'
        });
        
        if (result.value !== "DELETE") {
            if (result.isConfirmed) {
                Swal.fire('Cancelled', 'You must type exactly "DELETE" to confirm.', 'info');
            }
            return;
        }

        try {
            const { error } = await supabase.rpc('delete_user_completely', { target_user_id: id });
            
            if (error) {
                if (error.message.includes('function delete_user_completely does not exist')) {
                    throw new Error("The database function is missing. You need to run the setup SQL script in Supabase first.");
                }
                throw error;
            }

            setSuccess(`User ${email} has been completely wiped from the system.`);
            fetchUsers();
        } catch (err) {
            console.error('Hard delete error:', err);
            setError('Failed to completely delete user. ' + (err.message || ''));
        }
    };

    const pendingUsers = users.filter(user => user.role === 'pending');
    const activeUsers = users.filter(user => user.role !== 'pending' && user.role !== 'archived');
    const archivedUsers = users.filter(user => user.role === 'archived');

    const baseUsers = roleFilter === 'archived' ? archivedUsers : activeUsers;

    const filteredUsers = baseUsers.filter(user => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query ||
            user.name?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query);

        const matchesRole = roleFilter === 'all' || roleFilter === 'archived' ||
            user.role?.toLowerCase() === roleFilter.toLowerCase();

        return matchesSearch && matchesRole;
    });

    const StatCard = ({ icon, label, value, color }) => (
        <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="stat-icon" style={{ color: color }}>{icon}</div>
            <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Personnel Management</h1>
                    <p className="page-subtitle">National Livestock Development Board - Human Resource & Access Governance</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setIsPendingModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <span>🔔</span> Pending Requests
                        {pendingUsers.length > 0 && (
                            <span style={{
                                background: '#ef4444',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>{pendingUsers.length}</span>
                        )}
                    </button>
                    <button className="btn-primary" onClick={() => handleOpenModal()}>
                        <span>+</span> Onboard New Staff
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <StatCard icon="👥" label="Total Force" value={activeUsers.length} color="#6366f1" />
                    <StatCard icon="🛡️" label="Admins" value={activeUsers.filter(u => u.role === 'admin').length} color="#ef4444" />
                    <StatCard icon="📦" label="Storekeepers" value={activeUsers.filter(u => u.role === 'storekeeper').length} color="#f59e0b" />
                    <StatCard icon="💰" label="Sales Team" value={activeUsers.filter(u => u.role === 'salesman').length} color="#8b5cf6" />
                    <StatCard icon="🚚" label="Field Reps" value={activeUsers.filter(u => u.role === 'rep').length} color="#10b981" />
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontWeight: '600', border: '1px solid #fee2e2' }}>⚠️ {error}</div>}
                {success && <div style={{ background: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600', border: '1px solid #dcfce7' }}>✅ {success}</div>}

                <div className="registry-filter-hub sticky-registry-hub animate-fade">
                    <div className="search-field-modern" style={{ maxWidth: '400px' }}>
                        <span className="icon">🔍</span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search identity..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="filter-chips-wrapper" style={{ flex: 1 }}>
                        {[
                            { id: 'all', label: 'All Access' },
                            { id: 'admin', label: 'Admins' },
                            { id: 'storekeeper', label: 'Stock' },
                            { id: 'rep', label: 'Field' },
                            { id: 'salesman', label: 'Sales' },
                            { id: 'archived', label: 'Archived (Offboarded)' }
                        ].map(chip => (
                            <div
                                key={chip.id}
                                className={`filter-chip ${roleFilter === chip.id ? 'active' : ''}`}
                                onClick={() => setRoleFilter(chip.id)}
                            >
                                {chip.label}
                                {chip.id !== 'all' && (
                                    <span className="count">
                                        {chip.id === 'archived' ? archivedUsers.length : activeUsers.filter(u => u.role === chip.id).length}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn-reset-modern"
                        onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                    >
                        Reset
                    </button>
                </div>

                {
                    loading ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#6366f1' }}></div>
                            <p style={{ marginTop: '1rem', color: '#64748b' }}>Accessing personnel database...</p>
                        </div>
                    ) : (
                        <div className="modern-table-container">
                            {filteredUsers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                                    <h3 style={{ color: '#1e293b' }}>No personnel discovered</h3>
                                    <p style={{ color: '#64748b' }}>Try broadening your search parameters.</p>
                                </div>
                            ) : (
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Personnel Identity</th>
                                            <th>Access Classification</th>
                                            <th>Temporal Activity</th>
                                            <th className="text-right">Access Governance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6366f110', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                                            {user.name?.charAt(0)}
                                                        </div>
                                                        <div style={{ fontWeight: '800', color: '#1e293b' }}>{user.name}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase',
                                                        background: user.role === 'admin' ? '#fee2e2' : user.role === 'rep' ? '#dcfce7' : '#f1f5f9',
                                                        color: user.role === 'admin' ? '#ef4444' : user.role === 'rep' ? '#166534' : '#64748b',
                                                        border: `1px solid ${user.role === 'admin' ? '#fecaca' : user.role === 'rep' ? '#bbf7d0' : '#e2e8f0'}`
                                                    }}>{user.role}</span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '600', color: '#64748b' }}>{user.last_login ? new Date(user.last_login).toLocaleDateString() : ' Archival Record'}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user.last_login ? new Date(user.last_login).toLocaleTimeString() : 'No recent login detected'}</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        {user.role === 'archived' ? (
                                                            <>
                                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#10b981', borderColor: '#a7f3d0' }} onClick={() => handleRestoreAccess(user)}>Restore Access</button>
                                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#991b1b', borderColor: '#fca5a5' }} onClick={() => handleHardDeleteUser(user.id, user.email)} title="Permanently wipe user and data">Wipe</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(user)}>Edit Core</button>
                                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleDeleteUser(user.id)}>Revoke Access</button>
                                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#991b1b', borderColor: '#fca5a5' }} onClick={() => handleHardDeleteUser(user.id, user.email)} title="Permanently wipe user and data">Wipe</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )
                }
            </div>

            {/* Pending Requests Modal */}
            {isPendingModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '650px', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Pending Access Requests</h2>
                                <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>Review and approve new personnel registrations</p>
                            </div>
                            <button onClick={() => setIsPendingModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                        </div>

                        {pendingUsers.length === 0 ? (
                            <div className="empty-state">
                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
                                <h3 style={{ color: '#1e293b' }}>All caught up!</h3>
                                <p style={{ color: '#64748b' }}>There are no pending requests at this time.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {pendingUsers.map(user => (
                                    <div key={user.id} className="role-option-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem' }}>
                                                {user.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.1rem' }}>{user.name}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{user.email}</div>
                                                {user.phone && <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>📞 {user.phone}</div>}
                                                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Requested: {new Date(user.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                className="btn-cancel"
                                                style={{ padding: '0.6rem 1rem' }}
                                                onClick={() => handleDeleteUser(user.id, true)}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                className="btn-primary"
                                                style={{ padding: '0.6rem 1rem' }}
                                                onClick={() => handleOpenModal(user)}
                                            >
                                                Review & Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                            <button className="btn-secondary" onClick={() => setIsPendingModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {
                isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '550px', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{currentUser ? 'Modify Personnel Access' : 'Initialize Staff Onboarding'}</h2>
                                <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Full Legal Name *</label>
                                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="NLDB Employee Full Name" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '2rem' }}>
                                    <label className="form-label" style={{ marginBottom: '1rem', display: 'block', fontWeight: '700', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operations Role Mapping *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {[
                                            { id: 'admin', label: 'Admin', icon: '🛡️', desc: 'Full Access' },
                                            { id: 'storekeeper', label: 'Stock', icon: '📦', desc: 'Warehouse' },
                                            { id: 'rep', label: 'Field', icon: '🚚', desc: 'Routes' },
                                            { id: 'salesman', label: 'Sales', icon: '💰', desc: 'POS System' }
                                        ].map(role => (
                                            <div
                                                key={role.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    border: formData.role === role.id ? '2px solid #10b981' : '1px solid #e2e8f0',
                                                    background: formData.role === role.id ? '#ecfdf5' : '#ffffff',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: formData.role === role.id ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                                                }}
                                                onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                                                onMouseEnter={(e) => {
                                                    if (formData.role !== role.id) {
                                                        e.currentTarget.style.border = '1px solid #cbd5e1';
                                                        e.currentTarget.style.background = '#f8fafc';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (formData.role !== role.id) {
                                                        e.currentTarget.style.border = '1px solid #e2e8f0';
                                                        e.currentTarget.style.background = '#ffffff';
                                                    }
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '1.5rem',
                                                    width: '44px',
                                                    height: '44px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: formData.role === role.id ? '#ffffff' : '#f1f5f9',
                                                    borderRadius: '10px',
                                                    boxShadow: formData.role === role.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                                }}>
                                                    {role.icon}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', color: formData.role === role.id ? '#065f46' : '#1e293b', fontSize: '1.05rem', marginBottom: '2px' }}>{role.label}</div>
                                                    <div style={{ fontSize: '0.8rem', color: formData.role === role.id ? '#059669' : '#64748b', fontWeight: '500' }}>{role.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={handleCloseModal}>Abort</button>
                                    <button type="submit" className="btn-primary" style={{ flex: 2 }}>{currentUser ? 'Update Governance' : 'Authorize Entry'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Users;
