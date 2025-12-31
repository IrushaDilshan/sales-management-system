import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';
import './StoreKeeperDashboard.css';

const StoreKeeperDashboard = () => {
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { data: items } = await supabase.from('items').select('*');
            if (!items) return;

            setStats({
                totalItems: items.length || 0,
                lowStock: items.filter(i => i.quantity > 0 && i.quantity <= 10).length || 0,
                outOfStock: items.filter(i => i.quantity === 0).length || 0,
                totalValue: items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.retail_price || 0)), 0) || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon, label, value, color, suffix }) => (
        <div style={{ background: 'white', padding: '1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', borderBottom: `6px solid ${color}` }}>
            <div style={{ fontSize: '2.5rem', background: `${color}15`, width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>{suffix} {value}</div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div className="loading-spinner" style={{ borderTopColor: '#6366f1' }}></div>
            <p style={{ marginTop: '1.5rem', color: '#64748b', fontWeight: '600' }}>Synchronizing Vault Records...</p>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '3rem' }}>
                <div>
                    <h1 className="page-title">Inventory Command Center</h1>
                    <p className="page-subtitle">National Livestock Development Board - Central Logistics & Storage</p>
                </div>
                <div style={{ background: 'white', padding: '1rem 2rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 0 4px #10b98120' }}></div>
                    <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                <StatCard icon="📦" label="Catalog Breadth" value={stats.totalItems} color="#6366f1" />
                <StatCard icon="⚠️" label="Low Stock Protocols" value={stats.lowStock} color="#f59e0b" />
                <StatCard icon="❌" label="Depleted Reserves" value={stats.outOfStock} color="#ef4444" />
                <StatCard icon="🏦" label="Inventory Valuation" value={stats.totalValue.toLocaleString()} suffix="Rs." color="#10b981" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e293b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '8px', height: '32px', background: '#6366f1', borderRadius: '4px' }}></span>
                        Operations & Quick-Link Registry
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {[
                            { title: 'Catalog Management', desc: 'Initialize or modify biological/product SKU registry.', link: '/storekeeper/items', icon: '📋', color: '#6366f1' },
                            { title: 'Stock Surveillance', desc: 'Monitor real-time inventory levels across sectors.', link: '/storekeeper/stock', icon: '📈', color: '#10b981' },
                            { title: 'Internal Logistics', desc: 'Issue, receive, or authorize inter-depot transfers.', link: '/storekeeper/inventory', icon: '🔄', color: '#8b5cf6' },
                            { title: 'Archival Reports', desc: 'Generate historical movement and movement audits.', link: '/daily-income', icon: '📄', color: '#06b6d4' }
                        ].map((action, i) => (
                            <Link key={i} to={action.link} style={{ textDecoration: 'none', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '1rem', transition: '0.3s' }} className="quick-action-hover">
                                <div style={{ fontSize: '2rem', background: `${action.color}15`, width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', color: action.color }}>{action.icon}</div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{action.title}</h3>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>{action.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e293b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '8px', height: '32px', background: '#ef4444', borderRadius: '4px' }}></span>
                        Critical Oversight
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {stats.outOfStock > 0 && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '1.5rem', borderRadius: '20px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ fontSize: '2rem', background: 'white', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.1)' }}>🛑</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#991b1b' }}>Depleted Reserves ({stats.outOfStock})</div>
                                    <div style={{ fontSize: '0.75rem', color: '#b91c1c', opacity: 0.8 }}>Immediate requisition required.</div>
                                </div>
                                <Link to="/storekeeper/stock" style={{ color: '#ef4444', fontWeight: '900', textDecoration: 'none', fontSize: '1.2rem' }}>→</Link>
                            </div>
                        )}
                        {stats.lowStock > 0 && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1.5rem', borderRadius: '20px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ fontSize: '2rem', background: 'white', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.1)' }}>⚠️</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#92400e' }}>Low Visibility ({stats.lowStock})</div>
                                    <div style={{ fontSize: '0.75rem', color: '#a16207', opacity: 0.8 }}>Restock protocols recommended.</div>
                                </div>
                                <Link to="/storekeeper/stock" style={{ color: '#d97706', fontWeight: '900', textDecoration: 'none', fontSize: '1.2rem' }}>→</Link>
                            </div>
                        )}
                        {stats.outOfStock === 0 && stats.lowStock === 0 && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                                <h3 style={{ margin: 0, color: '#166534', fontWeight: '800' }}>Stock Optimized</h3>
                                <p style={{ margin: '0.5rem 0 0', color: '#15803d', fontSize: '0.85rem' }}>All biological and retail assets are at optimal levels.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .quick-action-hover:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1) !important;
                    border-color: #6366f130 !important;
                }
            `}</style>
        </div>
    );
};

export default StoreKeeperDashboard;
