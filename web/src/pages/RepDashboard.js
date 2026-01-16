import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const RepDashboard = () => {
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalRequests: 0,
        fulfilledToday: 0,
        assignedShops: 0
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardData(true);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: userRecord } = await supabase.from('users').select('id').eq('email', user?.email).single();
            const userId = userRecord?.id;

            const { data: myRoutes } = await supabase.from('routes').select('id').eq('rep_id', userId);
            const myRouteIds = myRoutes?.map(r => r.id) || [];

            let shopsQuery = supabase.from('shops').select('id');
            if (myRouteIds.length > 0) {
                shopsQuery = shopsQuery.or(`rep_id.eq.${userId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                shopsQuery = shopsQuery.eq('rep_id', userId);
            }
            const { data: myShops } = await shopsQuery;
            const myShopIds = myShops?.map(s => s.id) || [];

            if (myShopIds.length === 0) {
                setStats(prev => ({ ...prev, assignedShops: 0 }));
                setLoading(false);
                return;
            }

            const { data: requestsData } = await supabase.from('requests').select('id, status').in('shop_id', myShopIds);
            const pendingReqs = requestsData?.filter(r => r.status === 'pending') || [];

            const reqIds = pendingReqs.map(r => r.id);
            const { data: itemsData } = await supabase.from('request_items').select('qty, delivered_qty, item_id').in('request_id', reqIds);

            const itemIds = Array.from(new Set(itemsData?.map(i => i.item_id)));
            const { data: productsData } = await supabase.from('items').select('id, name').in('id', itemIds);
            const { data: stockTrans } = await supabase.from('stock_transactions').select('item_id, qty, type').eq('rep_id', userId).in('item_id', itemIds);

            const itemsMap = new Map();
            productsData?.forEach(p => itemsMap.set(p.id, p.name));

            const repStockMap = new Map();
            stockTrans?.forEach(t => {
                const current = repStockMap.get(t.item_id) || 0;
                repStockMap.set(t.item_id, t.type === 'OUT' ? current + t.qty : current - t.qty);
            });

            const aggregation = new Map();
            itemsData?.forEach(row => {
                const pending = row.qty - (row.delivered_qty || 0);
                if (pending <= 0) return;
                const existing = aggregation.get(row.item_id) || { itemName: itemsMap.get(row.item_id), totalPendingQty: 0, availableStock: repStockMap.get(row.item_id) || 0 };
                aggregation.set(row.item_id, { ...existing, totalPendingQty: existing.totalPendingQty + pending });
            });

            setPendingItems(Array.from(aggregation.values()));
            setStats({
                totalRequests: pendingReqs.length,
                fulfilledToday: requestsData?.filter(r => r.status === 'fulfilled' && new Date(r.updated_at).toDateString() === new Date().toDateString()).length || 0,
                assignedShops: myShopIds.length
            });
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            setError('Registry synchronization failed.');
        } finally {
            setLoading(false);
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
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Field Operations Control</h1>
                    <p className="page-subtitle">National Livestock Development Board - Representative Terminal</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {lastUpdated && <span style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center' }}>SYNC: {lastUpdated.toLocaleTimeString()}</span>}
                    <button className="btn-primary" onClick={() => fetchDashboardData()}>Refresh Registry</button>
                    <button className="btn-cancel" style={{ width: 'auto' }} onClick={() => { supabase.auth.signOut(); window.location.href = '/login'; }}>Logout</button>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <StatCard icon="📥" label="Pending Shop Requests" value={stats.totalRequests} color="#6366f1" />
                    <StatCard icon="🏪" label="Managed Outlets" value={stats.assignedShops} color="#10b981" />
                    <StatCard icon="✅" label="Fulfilled (Today)" value={stats.fulfilledToday} color="#06b6d4" />
                    <div onClick={() => window.location.href = '/rep/stock'} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', transition: '0.2s' }}>
                        <div style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.1)', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>📦</div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Vehicle Stock</div>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'white' }}>Manage Inventory →</div>
                        </div>
                    </div>
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>⚠️ {error}</div>}

                <div className="modern-table-container" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900' }}>Live Fulfillment Summary</h2>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Consolidated requirement across all managed routes</div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#6366f1' }}></div>
                            <p style={{ marginTop: '1rem', color: '#64748b' }}>Recalculating field requirements...</p>
                        </div>
                    ) : pendingItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                            <h3 style={{ color: '#1e293b' }}>Grid Sector Clear</h3>
                            <p style={{ color: '#64748b' }}>All distribution requests in your sector have been satisfied.</p>
                        </div>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Biological / Product SKU</th>
                                    <th style={{ textAlign: 'center' }}>Aggregate Requirement</th>
                                    <th style={{ textAlign: 'center' }}>Vehicle Stock On-Hand</th>
                                    <th style={{ textAlign: 'center' }}>Deployment Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingItems.map(item => {
                                    const hasEnough = item.availableStock >= item.totalPendingQty;
                                    return (
                                        <tr key={item.itemId}>
                                            <td><strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>{item.itemName}</strong></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ padding: '6px 14px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', fontWeight: '800', fontSize: '1.1rem' }}>{item.totalPendingQty}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ padding: '6px 14px', borderRadius: '8px', background: hasEnough ? '#f0fdf4' : '#fffbeb', color: hasEnough ? '#166534' : '#d97706', fontWeight: '800', fontSize: '1.1rem' }}>{item.availableStock}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '900',
                                                    textTransform: 'uppercase',
                                                    background: hasEnough ? '#10b981' : '#f59e0b',
                                                    color: 'white',
                                                    boxShadow: `0 4px 10px ${hasEnough ? '#10b98140' : '#f59e0b40'}`
                                                }}>{hasEnough ? 'READY FOR DEPLOY' : 'STOCK DEFICIT'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
        </div >
    );
};

export default RepDashboard;
