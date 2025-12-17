import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState({
        shops: 0,
        items: 0,
        lowStock: 0,
        pendingRequests: 0
    });
    const [recentRequests, setRecentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Parallel data fetching
            // 1. Shops count
            // 2. Items count
            // 3. Low stock count (stock table, qty < 10)
            // 4. Pending requests count
            // 5. Recent requests list

            const [
                { count: shopCount },
                { count: itemCount },
                { count: lowStockCount },
                { count: pendingCount },
                { data: requests }
            ] = await Promise.all([
                supabase.from('shops').select('*', { count: 'exact', head: true }),
                supabase.from('items').select('*', { count: 'exact', head: true }),
                supabase.from('stock').select('*', { count: 'exact', head: true }).lt('qty', 10),
                supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('requests')
                    .select(`
                        id, 
                        date, 
                        status,
                        shop:shops(name),
                        salesman:users!salesman_id(name)
                    `)
                    .order('date', { ascending: false })
                    .limit(5)
            ]);

            setStats({
                shops: shopCount || 0,
                items: itemCount || 0,
                lowStock: lowStockCount || 0,
                pendingRequests: pendingCount || 0
            });

            setRecentRequests(requests || []);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            // Fallback for requests if table doesn't exist
            if (err.message && err.message.includes('requests')) {
                setRecentRequests([]);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="text-gray-500">Overview of your sales distribution system</p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                    }}>
                        <StatCard
                            title="Total Shops"
                            value={stats.shops}
                            icon="🏪"
                            color="#4f46e5"
                            link="/shops"
                        />
                        <StatCard
                            title="Total Items"
                            value={stats.items}
                            icon="📦"
                            color="#0ea5e9"
                            link="/items"
                        />
                        <StatCard
                            title="Low Stock Alerts"
                            value={stats.lowStock}
                            icon="⚠️"
                            color="#ef4444"
                            isAlert={stats.lowStock > 0}
                            link="/stock"
                        />
                        <StatCard
                            title="Pending Requests"
                            value={stats.pendingRequests}
                            icon="📝"
                            color="#f59e0b"
                            isAlert={stats.pendingRequests > 0}
                        />
                    </div>

                    {/* Recent Requests Section */}
                    <div className="section-container" style={{
                        backgroundColor: 'var(--card-bg)',
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>Recent Requests</h2>

                        {recentRequests.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2rem 0' }}>
                                <p>No recent requests found.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Shop</th>
                                        <th>Salesman</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentRequests.map(req => (
                                        <tr key={req.id}>
                                            <td>{req.date ? new Date(req.date).toLocaleDateString() : 'N/A'}</td>
                                            <td>{req.shop?.name || 'Unknown'}</td>
                                            <td>{req.salesman?.name || 'Unknown'}</td>
                                            <td>
                                                <span className={`status-badge ${req.status === 'completed' ? 'status-active' :
                                                        req.status === 'pending' ? 'status-inactive' : ''
                                                    }`} style={{
                                                        backgroundColor: req.status === 'pending' ? '#fef3c7' : undefined,
                                                        color: req.status === 'pending' ? '#92400e' : undefined,
                                                        textTransform: 'capitalize'
                                                    }}>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon, color, isAlert, link }) => (
    <div style={{
        backgroundColor: 'var(--card-bg)',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s',
        cursor: link ? 'pointer' : 'default'
    }}
        onClick={() => link && (window.location.href = link)}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>{title}</span>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: isAlert ? '#ef4444' : 'var(--text-primary)' }}>
            {value}
        </div>
        {link && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: color, fontWeight: 500 }}>
                View Details &rarr;
            </div>
        )}
    </div>
);

export default Dashboard;
