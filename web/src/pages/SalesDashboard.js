import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import { Link } from 'react-router-dom';
import '../shared/ModernPage.css';

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
                .limit(5);

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

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales Dashboard</h1>
                    <p className="page-subtitle">Overview of products, inventory, and sales</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {/* Products */}
                <Link to="/items" style={{ textDecoration: 'none' }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        ':hover': { transform: 'translateY(-2px)' }
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                                    Total Products
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                    {stats.total_products}
                                </div>
                            </div>
                            <div style={{ fontSize: '3rem' }}>🏷️</div>
                        </div>
                    </div>
                </Link>

                {/* Customers */}
                <Link to="/customers" style={{ textDecoration: 'none' }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                                    Total Customers
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                                    {stats.total_customers}
                                </div>
                            </div>
                            <div style={{ fontSize: '3rem' }}>👥</div>
                        </div>
                    </div>
                </Link>

                {/* Today Sales */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                                Today's Sales
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                                {stats.today_sales}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.25rem' }}>
                                Rs. {stats.today_revenue.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ fontSize: '3rem' }}>💵</div>
                    </div>
                </div>

                {/* Outstanding */}
                <Link to="/sales-history" style={{ textDecoration: 'none' }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                                    Pending Payments
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>
                                    {stats.pending_payments}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.25rem' }}>
                                    Rs. {stats.outstanding_amount.toFixed(2)}
                                </div>
                            </div>
                            <div style={{ fontSize: '3rem' }}>⚠️</div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Low Stock Alert */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Low Stock Alerts</h3>
                        <Link to="/stock" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            View All
                        </Link>
                    </div>
                    {lowStockItems.length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
                            No low stock items ✓
                        </div>
                    ) : (
                        <div>
                            {lowStockItems.map((item, idx) => (
                                <div key={idx} style={{
                                    padding: '0.75rem',
                                    borderBottom: '1px solid #f3f4f6',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <strong>{item.product_name}</strong>
                                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                            {item.outlet_name}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                            {item.current_stock}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                            Min: {item.minimum_stock_level}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expiring Soon */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Expiring Soon</h3>
                        <Link to="/stock" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            View All
                        </Link>
                    </div>
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem'
                    }}>
                        {stats.expiring_soon > 0 ? (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🟡</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                                    {stats.expiring_soon} Items
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                                    Expiring within 7 days
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>
                                <div style={{ color: '#059669' }}>No items expiring soon</div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Sales */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Recent Sales</h3>
                    <Link to="/sales-history" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                        View All
                    </Link>
                </div>
                {recentSales.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
                        No sales yet. Start making sales!
                    </div>
                ) : (
                    <table className="data-table">
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
                                    <td><strong>{sale.invoice_number}</strong></td>
                                    <td>
                                        {new Date(sale.sale_date).toLocaleDateString()}
                                    </td>
                                    <td>{sale.customers?.name || 'Walk-in'}</td>
                                    <td>{sale.shops?.name || '-'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        Rs. {parseFloat(sale.total_amount).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${sale.payment_status === 'paid' ? 'badge-success' :
                                                sale.payment_status === 'pending' ? 'badge-warning' : 'badge-info'
                                            }`}>
                                            {sale.payment_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
            }}>
                <Link to="/sales" className="btn-primary" style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '1rem'
                }}>
                    💵 New Sale
                </Link>
                <Link to="/items" className="btn-primary" style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '1rem',
                    backgroundColor: '#8b5cf6'
                }}>
                    🏷️ Add Product
                </Link>
                <Link to="/customers" className="btn-primary" style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '1rem',
                    backgroundColor: '#10b981'
                }}>
                    👥 Add Customer
                </Link>
                <Link to="/stock" className="btn-primary" style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '1rem',
                    backgroundColor: '#f59e0b'
                }}>
                    📊 Manage Stock
                </Link>
            </div>
        </div>
    );
};

export default SalesDashboard;
