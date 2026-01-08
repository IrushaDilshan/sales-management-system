import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

export default function Routes() {
    const [routes, setRoutes] = useState([]);
    const [shops, setShops] = useState([]);
    const [reps, setReps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        rep_id: '',
        selectedShops: []
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [{ data: routesData }, { data: shopsData }, { data: repsData }] = await Promise.all([
                supabase.from('routes').select('*').order('name'),
                supabase.from('shops').select('*').order('name'),
                supabase.from('users').select('id, name').eq('role', 'rep').order('name')
            ]);

            const enrichedRoutes = (routesData || []).map(route => {
                const rep = repsData?.find(r => r.id === route.rep_id);
                const routeShops = shopsData?.filter(s => s.route_id === route.id) || [];
                return {
                    ...route,
                    repName: rep?.name || 'Unassigned',
                    shopCount: routeShops.length,
                    shops: routeShops
                };
            });

            setRoutes(enrichedRoutes);
            setShops(shopsData || []);
            setReps(repsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (route = null) => {
        if (route) {
            setFormData({
                id: route.id,
                name: route.name,
                rep_id: route.rep_id || '',
                selectedShops: route.shops.map(s => s.id)
            });
        } else {
            setFormData({ id: null, name: '', rep_id: '', selectedShops: [] });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', rep_id: '', selectedShops: [] });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShopToggle = (shopId) => {
        setFormData(prev => ({
            ...prev,
            selectedShops: prev.selectedShops.includes(shopId)
                ? prev.selectedShops.filter(id => id !== shopId)
                : [...prev.selectedShops, shopId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let routeId = formData.id;

            if (formData.id) {
                await supabase.from('routes').update({ name: formData.name, rep_id: formData.rep_id || null }).eq('id', formData.id);
            } else {
                const { data: newRoute } = await supabase.from('routes').insert([{ name: formData.name, rep_id: formData.rep_id || null }]).select().single();
                routeId = newRoute.id;
            }

            await supabase.from('shops').update({ route_id: null }).eq('route_id', routeId);
            if (formData.selectedShops.length > 0) {
                await supabase.from('shops').update({ route_id: routeId }).in('id', formData.selectedShops);
            }

            fetchData();
            handleCloseModal();
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Dissolve this logistical route? All associated outlets will be unmapped.')) {
            try {
                await supabase.from('shops').update({ route_id: null }).eq('route_id', id);
                await supabase.from('routes').delete().eq('id', id);
                fetchData();
            } catch (err) {
                console.error('Error deleting route:', err);
            }
        }
    };

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
                    <h1 className="page-title">Route Logistics</h1>
                    <p className="page-subtitle">National Livestock Development Board - Distribution Network Mapping</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span>+</span> Define New Route
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <StatCard icon="🗺️" label="Active Routes" value={routes.length} color="#6366f1" />
                <StatCard icon="🏢" label="Mapped Outlets" value={shops.filter(s => s.route_id).length} color="#10b981" />
                <StatCard icon="👤" label="Field Coverage" value={reps.length} color="#06b6d4" />
                <StatCard icon="⚠️" label="Unmapped Outlets" value={shops.filter(s => !s.route_id).length} color="#f43f5e" />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#6366f1' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Calculating distribution vectors...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {routes.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '24px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
                            <h3 style={{ color: '#1e293b' }}>No logistical routes defined</h3>
                            <p style={{ color: '#64748b' }}>Initialize your first distribution vector to begin network mapping.</p>
                        </div>
                    ) : (
                        routes.map(route => (
                            <div key={route.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '24px',
                                    padding: '0',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    cursor: 'default',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                    padding: '1.5rem',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                                            LOGISTICS ROUTE
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#1e293b' }}>{route.name}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleOpenModal(route)}
                                            style={{
                                                background: 'white', border: '1px solid #e2e8f0', width: '36px', height: '36px',
                                                borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', transition: '0.2s', fontSize: '1rem',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                            }}
                                            title="Edit Route"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(route.id)}
                                            style={{
                                                background: '#fff1f2', border: '1px solid #ffe4e6', width: '36px', height: '36px',
                                                borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', transition: '0.2s', fontSize: '1rem',
                                                boxShadow: '0 2px 5px rgba(244, 63, 94, 0.1)'
                                            }}
                                            title="Delete Route"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5rem' }}>

                                    {/* Stats Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {/* Rep Info */}
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Field Agent</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '12px',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: '800', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                                }}>
                                                    {route.repName?.charAt(0)}
                                                </div>
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '0.95rem' }}>{route.repName}</div>
                                            </div>
                                        </div>

                                        {/* Depot Count */}
                                        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '16px', border: '1px solid #dcfce7' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Depots</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#15803d' }}>
                                                {route.shopCount}
                                                <span style={{ fontSize: '0.8rem', marginLeft: '4px', opacity: 0.7, fontWeight: '700' }}>UNITS</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Outlets List */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>Mapped Network Coverage</span>
                                            {route.shops.length > 0 && <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', color: '#64748b' }}>{route.shops.length} Total</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {route.shops.length > 0 ? (
                                                <>
                                                    {route.shops.slice(0, 6).map(shop => (
                                                        <span key={shop.id} style={{
                                                            padding: '6px 10px', background: 'white', border: '1px solid #e2e8f0',
                                                            color: '#475569', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '6px'
                                                        }}>
                                                            <span style={{ color: '#10b981', fontSize: '0.6rem' }}>●</span> {shop.name}
                                                        </span>
                                                    ))}
                                                    {route.shops.length > 6 && (
                                                        <span style={{
                                                            padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0',
                                                            color: '#64748b', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700',
                                                            cursor: 'help'
                                                        }} title={`+ ${route.shops.slice(6).map(s => s.name).join(', ')}`}>
                                                            +{route.shops.length - 6} More
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{
                                                    width: '100%', padding: '1rem', border: '2px dashed #e2e8f0', borderRadius: '12px',
                                                    textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', background: '#f8fafc'
                                                }}>
                                                    No outlets mapped to this vector
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{formData.id ? 'Modify Logistics Vector' : 'Define New Distribution Route'}</h2>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                        </div>
                        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600' }}>⚠️ {error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Route Designation *</label>
                                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Logistical Sector Name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assigned Representative</label>
                                    <select className="form-control" name="rep_id" value={formData.rep_id} onChange={handleInputChange}>
                                        <option value="">-- Leave Unassigned --</option>
                                        {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label className="form-label">Cluster Outlets (Select to Map)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    {shops.map(shop => (
                                        <label key={shop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: formData.selectedShops.includes(shop.id) ? '#6366f110' : 'white', border: `1px solid ${formData.selectedShops.includes(shop.id) ? '#6366f1' : '#e2e8f0'}`, borderRadius: '12px', cursor: 'pointer', transition: '0.2s' }}>
                                            <input type="checkbox" checked={formData.selectedShops.includes(shop.id)} onChange={() => handleShopToggle(shop.id)} style={{ width: '18px', height: '18px' }} />
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>{shop.name}</div>
                                                {shop.route_id && shop.route_id !== formData.id && <div style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: '700' }}>ALREADY MAPPED</div>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={handleCloseModal}>Abort</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2 }}>{formData.id ? 'Execute Modification' : 'Initialize Vector'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
