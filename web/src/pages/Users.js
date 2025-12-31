import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
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

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name');

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load personnel registry.');
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
                role: user.role
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
                const { error } = await supabase
                    .from('users')
                    .update({
                        name: formData.name,
                        role: formData.role
                    })
                    .eq('id', currentUser.id);

                if (error) throw error;
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

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Strike this individual from the active personnel registry?')) return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSuccess('Personnel entry archived/removed.');
            fetchUsers();
        } catch (err) {
            console.error('Delete error:', err);
            setError('Failed to archive personnel entry.');
        }
    };

    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            user.name?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const StatCard = ({ icon, label, value, color }) => (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderLeft: `6px solid ${color}` }}>
            <div style={{ fontSize: '2rem', background: `${color}10`, width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>{value}</div>
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
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span>+</span> Onboard New Staff
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <StatCard icon="👥" label="Total Force" value={users.length} color="#6366f1" />
                <StatCard icon="🛡️" label="Administrators" value={users.filter(u => u.role === 'admin').length} color="#ef4444" />
                <StatCard icon="🚚" label="Field Reps" value={users.filter(u => u.role === 'rep').length} color="#10b981" />
                <StatCard icon="📦" label="Logistics Staff" value={users.filter(u => u.role === 'storekeeper').length} color="#f59e0b" />
            </div>

            {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600', border: '1px solid #fee2e2' }}>⚠️ {error}</div>}
            {success && <div style={{ background: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600', border: '1px solid #dcfce7' }}>✅ {success}</div>}

            <div className="registry-filter-hub animate-fade">
                <div className="search-field-modern">
                    <span className="icon">🔍</span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, role or operation tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-group-modern">
                    <select
                        className="form-control"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">All Access Groups</option>
                        <option value="admin">Administrators</option>
                        <option value="storekeeper">Stock Control</option>
                        <option value="ma">Management Assistance</option>
                        <option value="rep">Field Operations</option>
                        <option value="salesman">Sales Teams</option>
                    </select>
                </div>
                <button
                    className="btn-reset-modern"
                    onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                >
                    Reset
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#6366f1' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Accessing personnel database...</p>
                </div>
            ) : (
                <div className="table-container">
                    {filteredUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                            <h3 style={{ color: '#1e293b' }}>No personnel discovered</h3>
                            <p style={{ color: '#64748b' }}>Try broadening your search parameters.</p>
                        </div>
                    ) : (
                        <table className="data-table">
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
                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(user)}>Edit Core</button>
                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleDeleteUser(user.id)}>Revoke Access</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {isModalOpen && (
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
                                <label className="form-label">Operations Role Mapping *</label>
                                <div className="role-selector-grid">
                                    {[
                                        { id: 'admin', label: 'Admin', icon: '🛡️', desc: 'Full Access' },
                                        { id: 'storekeeper', label: 'Stock', icon: '📦', desc: 'Warehouse' },
                                        { id: 'ma', label: 'MA', icon: '📝', desc: 'Admin Asst' },
                                        { id: 'rep', label: 'Field', icon: '🚚', desc: 'Routes' },
                                        { id: 'salesman', label: 'Sales', icon: '💰', desc: 'POS System' }
                                    ].map(role => (
                                        <div
                                            key={role.id}
                                            className={`role-option-card ${formData.role === role.id ? 'selected' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                                        >
                                            <span className="role-icon-lg">{role.icon}</span>
                                            <div>
                                                <div className="role-label-sm">{role.label}</div>
                                                <div className="role-desc-xs">{role.desc}</div>
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
            )}
        </div>
    );
};

export default Users;
