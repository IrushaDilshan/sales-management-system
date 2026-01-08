import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import { Link } from 'react-router-dom';
import './SalesDashboard.css';

const SalesDashboard = () => {
    const [stats, setStats] = useState({
        total_products: 0,
        total_customers: 0,
        today_sales: 0,
        today_revenue: 0,
        low_stock_items: 0,
        expiring_soon: 0,
        pending_payments: 0,
        outstanding_amount: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentSales, setRecentSales] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Get total products
            const { count: productCount } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true });

            // Get total customers
            const { count: customerCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Get today's sales
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data: todaySales } = await supabase
                .from('sales')
                .select('total_amount')
                .gte('sale_date', today.toISOString());

            const todaySalesCount = todaySales?.length || 0;
            const todayRevenue = todaySales?.reduce((sum, s) => sum + parseFloat(s.total_amount), 0) || 0;

            // Get low stock alerts
            const { data: lowStock } = await supabase
                .from('low_stock_alerts')
                .select('*')
                .limit(5);

            // Get expiring soon items
            const { data: expiring } = await supabase
                .from('expiring_soon')
                .select('*', { count: 'exact', head: true });

            // Get pending payments
            const { data: pendingSales } = await supabase
                .from('sales')
                .select('amount_due')
                .in('payment_status', ['pending', 'partial']);

            const pendingCount = pendingSales?.length || 0;
            const outstandingAmount = pendingSales?.reduce((sum, s) => sum + parseFloat(s.amount_due), 0) || 0;

            // Get recent sales for display
            const { data: recent } = await supabase
                .from('sales')
                .select(`
                    *,
                    customers (name),
                    shops (name)
                `)
                .order('sale_date', { ascending: false })
                .limit(6);

            setStats({
                total_products: productCount || 0,
                total_customers: customerCount || 0,
                today_sales: todaySalesCount,
                today_revenue: todayRevenue,
                low_stock_items: lowStock?.length || 0,
                expiring_soon: expiring?.length || 0,
                pending_payments: pendingCount,
                outstanding_amount: outstandingAmount
            });

            setRecentSales(recent || []);
            setLowStockItems(lowStock || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon, title, value, footer, color, link }) => (
        <Link to={link || '#'} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
                {icon}
            </div>
            <div className="stat-info">
                <div className="stat-title">{title}</div>
                <div className="stat-value">{value}</div>
                {footer && (
                    <div className="stat-footer" style={{ color }}>
                        {footer}
                    </div>
                )}
            </div>
        </Link>
    );

    const QuickActionCard = ({ icon, title, description, link, color }) => (
        <Link to={link} className="quick-action-card">
            <div className="action-icon" style={{ backgroundColor: `${color}15`, color }}>
                {icon}
            </div>
            <div className="action-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <div className="action-arrow">→</div>
        </Link>
    );

    if (loading) {
        return (
            <div className="dashboard-container">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <div className="loading-spinner" style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #10853e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: '500' }}>Preparing your dashboard...</p>
                </div>
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-text">
                    <h1 className="dashboard-title">Sales Dashboard</h1>
                    <p className="dashboard-subtitle">Real-time performance and inventory metrics</p>
                </div>
                <div className="dashboard-date">
                    <span style={{ marginRight: '8px' }}>📅</span>
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}
                </div>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon="🏷️"
                    title="Total Products"
                    value={stats.total_products}
                    footer="Active SKUs"
                    color="#3b82f6"
                    link="/items"
                />
                <StatCard
                    icon="👥"
                    title="Total Customers"
                    value={stats.total_customers}
                    footer="Active in system"
                    color="#8b5cf6"
                    link="/customers"
                />
                <StatCard
                    icon="💵"
                    title="Today's Sales"
                    value={stats.today_sales}
                    footer={`Rs. ${stats.today_revenue.toLocaleString()}`}
                    color="#10b981"
                    link="/sales-history"
                />
                <StatCard
                    icon="⚠️"
                    title="Pending Payments"
                    value={stats.pending_payments}
                    footer={`Total: Rs. ${stats.outstanding_amount.toLocaleString()}`}
                    color="#ef4444"
                    link="/sales-history"
                />
            </div>

            <div className="alerts-grid">
                {/* Low Stock Panel */}
                <div className="alert-panel">
                    <div className="panel-header">
                        <div className="panel-title">📉 Low Stock Alerts</div>
                        <Link to="/stock" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>View All</Link>
                    </div>
                    {lowStockItems.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                            <p>Inventory levels are healthy</p>
                        </div>
                    ) : (
                        lowStockItems.map((item, idx) => (
                            <div key={idx} className="alert-item">
                                <div className="alert-info">
                                    <h4>{item.product_name}</h4>
                                    <p>{item.outlet_name}</p>
                                </div>
                                <div className="alert-value">
                                    <div className="alert-number" style={{ color: '#ef4444' }}>{item.current_stock}</div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Min: {item.minimum_stock_level}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Expiry Panel */}
                <div className="alert-panel">
                    <div className="panel-header">
                        <div className="panel-title">🗓️ Expiring Soon</div>
                        <Link to="/stock" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Manage Expiring</Link>
                    </div>
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                        {stats.expiring_soon > 0 ? (
                            <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '1.5rem', border: '1px solid #fef3c7' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{stats.expiring_soon} Items</div>
                                <p style={{ color: '#92400e', fontWeight: '500', marginTop: '0.5rem' }}>Require immediate attention to avoid losses</p>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                                <p style={{ color: '#10b981', fontWeight: '600' }}>No items expiring within 7 days</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Sales Section */}
            <div className="history-section">
                <div className="panel-header" style={{ borderBottom: 'none', marginBottom: '2rem' }}>
                    <div className="panel-title">📄 Recent Transactions</div>
                    <Link to="/sales-history" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Full History</Link>
                </div>
                {recentSales.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        No transactions recorded yet.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Outlet</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map(sale => (
                                    <tr key={sale.id}>
                                        <td><span className="invoice-pill">{sale.invoice_number}</span></td>
                                        <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: '600' }}>{sale.customers?.name || 'Walk-in'}</td>
                                        <td>{sale.shops?.name || '-'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '700' }}>
                                            Rs. {parseFloat(sale.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                backgroundColor: sale.payment_status === 'paid' ? '#ecfdf5' : sale.payment_status === 'pending' ? '#fffbeb' : '#eff6ff',
                                                color: sale.payment_status === 'paid' ? '#059669' : sale.payment_status === 'pending' ? '#d97706' : '#2563eb'
                                            }}>
                                                {sale.payment_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <h2 className="section-title">Operations</h2>
            <div className="actions-grid">
                <QuickActionCard
                    icon="💵"
                    title="New Sale"
                    description="Create a new transaction"
                    link="/sales"
                    color="#10b981"
                />
                <QuickActionCard
                    icon="📦"
                    title="Add Stock"
                    description="Update inventory levels"
                    link="/items"
                    color="#3b82f6"
                />
                <QuickActionCard
                    icon="👥"
                    title="New Customer"
                    description="Register a new client"
                    link="/customers"
                    color="#8b5cf6"
                />
                <QuickActionCard
                    icon="📉"
                    title="Daily Reports"
                    description="View income analytics"
                    link="/daily-income"
                    color="#f59e0b"
                />
            </div>
        </div>
    );
};

export default SalesDashboard;
