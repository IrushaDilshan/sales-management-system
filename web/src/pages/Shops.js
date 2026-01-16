import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Shops = () => {
    const [shops, setShops] = useState([]);
    const [reps, setReps] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', rep_id: '', route_id: '', salesman_id: '', is_owner: false });
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('all');

    const [stats, setStats] = useState({
        total: 0,
        routes: 0,
        unassigned: 0,
        covered: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [shops, routes]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch ALL users first (mimic Users.js which works)
            const { data: allUsers, error: usersError } = await supabase
                .from('users')
                .select('*')
                .order('name');

            if (usersError) throw usersError;

            // 2. Filter in memory to ensure we catch everyone
            // Normalize role to lowercase to handle potential DB inconsistencies
            const relevantUsers = (allUsers || []).filter(u => {
                const r = (u.role || '').toLowerCase();
                return r === 'salesman' || r === 'shop_owner' || r === 'pending';
            });
            console.log('Fetched Users (Raw):', allUsers?.length);
            console.log('Filtered Salesmen Candidates:', relevantUsers.length);
            setSalesmen(relevantUsers);

            const [{ data: shopsData }, { data: repsData }, { data: routesData }] = await Promise.all([
                supabase.from('shops').select('*').order('name'),
                supabase.from('users').select('id, name').eq('role', 'rep'),
                supabase.from('routes').select('id, name').order('name')
            ]);

            setReps(repsData || []);
            setRoutes(routesData || []);

            const formattedShops = (shopsData || []).map(shop => {
                const assignedRep = repsData?.find(r => r.id === shop.rep_id);
                const assignedRoute = routesData?.find(r => r.id === shop.route_id);
                // Use loose equality (==) as shop_id might be string vs number
                // Search in ALL users to ensure we find them even if role changed
                const assignedSalesman = allUsers?.find(s => s.shop_id == shop.id);

                return {
                    ...shop,
                    rep: assignedRep || null,
                    route: assignedRoute || null,
                    salesman: assignedSalesman || null
                };
            });
            setShops(formattedShops);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(`Failed to load data: ${err.message}. Please check your database migrations.`);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        setStats({
            total: shops.length,
            routes: routes.length,
            unassigned: shops.filter(s => !s.route_id).length,
            covered: shops.filter(s => s.salesman).length
        });
    };

    const handleOpenModal = (shop = null) => {
        if (shop) {
            setFormData({
                id: shop.id,
                name: shop.name || '',
                rep_id: shop.rep_id || '',
                route_id: shop.route_id || '',
                salesman_id: shop.salesman?.id || '',
                is_owner: shop.salesman?.role === 'shop_owner'
            });
        } else {
            setFormData({ id: null, name: '', rep_id: '', route_id: '', salesman_id: '', is_owner: false });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', rep_id: '', route_id: '', salesman_id: '', is_owner: false });
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newData = { ...prev, [name]: finalValue };

            // Auto-set checkbox based on selected user's current role if dropdown changes
            if (name === 'salesman_id') {
                const selectedUser = salesmen.find(s => s.id === value);
                if (selectedUser) {
                    newData.is_owner = selectedUser.role === 'shop_owner';
                } else {
                    newData.is_owner = false;
                }
            }
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const shopUpdates = {
                name: formData.name,
                rep_id: formData.rep_id || null,
                route_id: formData.route_id || null
            };

            let shopId;
            if (formData.id) {
                await supabase.from('shops').update(shopUpdates).eq('id', formData.id);
                shopId = formData.id;
            } else {
                const { data: newShop } = await supabase.from('shops').insert([shopUpdates]).select().single();
                shopId = newShop?.id;
            }

            if (formData.salesman_id) {
                // Remove previous assignments for this shop
                await supabase.from('users').update({ shop_id: null }).eq('shop_id', shopId).neq('id', formData.salesman_id);

                // Update selected user: Assign shop AND update Role
                const newRole = formData.is_owner ? 'shop_owner' : 'salesman';
                await supabase.from('users').update({
                    shop_id: shopId,
                    role: newRole
                }).eq('id', formData.salesman_id);
            }

            fetchData();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Terminate this outlet registration? Internal records will be archived.')) {
            try {
                await supabase.from('users').update({ shop_id: null }).eq('shop_id', id);
                await supabase.from('shops').delete().eq('id', id);
                fetchData();
            } catch (err) {
                console.error('Error deleting shop:', err);
            }
        }
    };

    const filteredShops = shops.filter(shop => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            shop.name?.toLowerCase().includes(query) ||
            shop.route?.name?.toLowerCase().includes(query) ||
            shop.salesman?.name?.toLowerCase().includes(query);
        const matchesRoute = selectedRoute === 'all' || shop.route_id?.toString() === selectedRoute;
        return matchesSearch && matchesRoute;
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
                    <h1 className="page-title">Retail Network</h1>
                    <p className="page-subtitle">National Livestock Development Board - Outlet & Branch Registry</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span>+</span> Register New Outlet
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <StatCard icon="🏪" label="Operational Outlets" value={stats.total} color="#6366f1" />
                <StatCard icon="🛣️" label="Active Routes" value={stats.routes} color="#10b981" />
                <StatCard icon="🚶" label="Staffed Coverage" value={stats.covered} color="#06b6d4" />
                <StatCard icon="❓" label="Route Unassigned" value={stats.unassigned} color="#f43f5e" />
            </div>

            <div className="registry-filter-hub" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Network Search</label>
                    <input type="text" className="form-control" placeholder="Identify by shop name, route, or assigned staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div style={{ width: '250px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Deployment Route</label>
                    <select className="form-control" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                        <option value="all">Every Route</option>
                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <button className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} onClick={() => { setSearchQuery(''); setSelectedRoute('all'); }}>Reset Registry</button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#6366f1' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Pulling network data...</p>
                </div>
            ) : (
                <div className="modern-table-container">
                    {filteredShops.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔦</div>
                            <h3 style={{ color: '#f8fafc' }}>No matching outlets</h3>
                            <p style={{ color: '#94a3b8' }}>Try broadening your search or adjusting the route filter.</p>
                        </div>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Outlet Identity</th>
                                    <th>Deployment Route</th>
                                    <th>Primary Salesman</th>
                                    <th>Field Representative</th>
                                    <th className="text-right">Governance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredShops.map(shop => (
                                    <tr key={shop.id}>
                                        <td><strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>{shop.name}</strong></td>
                                        <td>{shop.route ? <span style={{ padding: '4px 10px', background: '#f5f3ff', color: '#6d28d9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>🛣️ {shop.route.name}</span> : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Unmapped</span>}</td>
                                        <td>
                                            {shop.salesman ? (
                                                <div>
                                                    <span style={{ fontWeight: '700', color: shop.salesman.role === 'shop_owner' ? '#d97706' : '#059669', display: 'block' }}>
                                                        {shop.salesman.role === 'shop_owner' ? '👑' : '👤'} {shop.salesman.name}
                                                        <span style={{ fontSize: '0.75rem', marginLeft: '6px', opacity: 0.8, fontWeight: '600' }}>
                                                            ({shop.salesman.role === 'shop_owner' ? 'Owner' : 'Sales'})
                                                        </span>
                                                    </span>
                                                    {shop.salesman.phone && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>📞 {shop.salesman.phone}</span>}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#cbd5e1' }}>Vacant</span>
                                            )}
                                        </td>
                                        <td>{shop.rep ? <span style={{ color: '#444', fontWeight: '600' }}>🛡️ {shop.rep.name}</span> : <span style={{ color: '#cbd5e1' }}>Pending Assignment</span>}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(shop)}>Modify</button>
                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => handleDelete(shop.id)}>Terminate</button>
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
                    <div className="modal-content" style={{ maxWidth: '650px', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{formData.id ? 'Modify Outlet Specification' : 'Register New Network Node'}</h2>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                        </div>
                        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600' }}>⚠️ {error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Official Outlet Name *</label>
                                <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="NLDB Registered Shop Name" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Territory Route Mapping</label>
                                    <select className="form-control" name="route_id" value={formData.route_id} onChange={handleInputChange}>
                                        <option value="">-- No Route (Standalone) --</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Resident Salesman Assignment</label>
                                    <select className="form-control" name="salesman_id" value={formData.salesman_id} onChange={handleInputChange}>
                                        <option value="">-- Leave Vacant --</option>
                                        {salesmen.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.role === 'pending' ? '⏳ ' : ''}{s.name} ({s.role === 'pending' ? 'Pending Approval' : s.role}) {s.phone ? `- 📞 ${s.phone}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.salesman_id && (
                                        <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                id="isOwner"
                                                name="is_owner"
                                                checked={formData.is_owner}
                                                onChange={handleInputChange}
                                                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                            />
                                            <label htmlFor="isOwner" style={{ fontSize: '0.85rem', color: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}>
                                                Grant 'Shop Owner' Status 👑
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label className="form-label">Supervising Field Representative</label>
                                <select className="form-control" name="rep_id" value={formData.rep_id} onChange={handleInputChange}>
                                    <option value="">-- Default to Route Rep --</option>
                                    {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={handleCloseModal}>Abort</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2 }}>{formData.id ? 'Execute Modification' : 'Initialize Registration'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shops;
