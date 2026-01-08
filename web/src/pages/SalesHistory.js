import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const SalesHistory = () => {
    const [sales, setSales] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saleItems, setSaleItems] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        outlet_id: 'all',
        customer_id: 'all',
        payment_status: 'all',
        payment_method: 'all',
        date_from: '',
        date_to: '',
        search: ''
    });

    // Summary stats
    const [stats, setStats] = useState({
        total_sales: 0,
        total_amount: 0,
        total_paid: 0,
        total_due: 0,
        cash_sales: 0,
        credit_sales: 0
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchSales();
    }, [filters]);

    const fetchInitialData = async () => {
        try {
            const [{ data: outletsData }, { data: customersData }] = await Promise.all([
                supabase.from('shops').select('*').order('name'),
                supabase.from('customers').select('*').order('name')
            ]);
            setOutlets(outletsData || []);
            setCustomers(customersData || []);
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    const fetchSales = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('sales')
                .select(`
                    *,
                    shops:outlet_id (name),
                    customers:customer_id (name, phone)
                `)
                .order('sale_date', { ascending: false });

            if (filters.outlet_id !== 'all') query = query.eq('outlet_id', filters.outlet_id);
            if (filters.customer_id !== 'all') query = query.eq('customer_id', filters.customer_id);
            if (filters.payment_status !== 'all') query = query.eq('payment_status', filters.payment_status);
            if (filters.payment_method !== 'all') query = query.eq('payment_method', filters.payment_method);
            if (filters.date_from) query = query.gte('sale_date', filters.date_from);
            if (filters.date_to) {
                const toDate = new Date(filters.date_to);
                toDate.setHours(23, 59, 59, 999);
                query = query.lte('sale_date', toDate.toISOString());
            }
            if (filters.search) query = query.or(`invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);

            const { data, error } = await query;
            if (error) throw error;
            setSales(data || []);
            calculateStats(data || []);
        } catch (err) {
            console.error('Error fetching sales:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (salesData) => {
        const stats = {
            total_sales: salesData.length,
            total_amount: salesData.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0),
            total_paid: salesData.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0),
            total_due: salesData.reduce((sum, s) => sum + parseFloat(s.amount_due || 0), 0),
            cash_sales: salesData.filter(s => s.payment_method === 'cash').length,
            credit_sales: salesData.filter(s => s.payment_method === 'credit').length
        };
        setStats(stats);
    };

    const viewSaleDetails = async (sale) => {
        try {
            const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
            if (error) throw error;
            setSaleItems(data || []);
            setSelectedSale(sale);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Error fetching sale items:', err);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            outlet_id: 'all', customer_id: 'all', payment_status: 'all',
            payment_method: 'all', date_from: '', date_to: '', search: ''
        });
    };

    const StatCard = ({ icon, label, value, color, suffix }) => (
        <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            borderLeft: `6px solid ${color}`
        }}>
            <div style={{ fontSize: '2rem', background: `${color}10`, width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>{suffix} {value}</div>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Transaction Ledger</h1>
                    <p className="page-subtitle">National Livestock Development Board - Archaeological Sales Registry</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" onClick={() => window.print()}><span>🖨️</span> PDF Report</button>
                    <button className="btn-primary" onClick={fetchSales}><span>🔄</span> Sync Data</button>
                </div>
            </div>

            {/* Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <StatCard icon="📊" label="Transaction Volume" value={stats.total_sales} color="#6366f1" />
                <StatCard icon="💹" label="Gross Revenue" value={stats.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} suffix="Rs." color="#10b981" />
                <StatCard icon="📥" label="Realized Income" value={stats.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })} suffix="Rs." color="#06b6d4" />
                <StatCard icon="💸" label="Accounts Receivable" value={stats.total_due.toLocaleString(undefined, { minimumFractionDigits: 2 })} suffix="Rs." color="#f43f5e" />
            </div>

            {/* Advanced Filters */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Internal Search</label>
                        <input type="text" className="form-control" placeholder="Invoice # or Customer name" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Operation Center</label>
                        <select className="form-control" value={filters.outlet_id} onChange={(e) => handleFilterChange('outlet_id', e.target.value)}>
                            <option value="all">Everywhere</option>
                            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Status Protocol</label>
                        <select className="form-control" value={filters.payment_status} onChange={(e) => handleFilterChange('payment_status', e.target.value)}>
                            <option value="all">Any Status</option>
                            <option value="paid">Fully Settled</option>
                            <option value="pending">Awaiting Payment</option>
                            <option value="overdue">Overdue Arrears</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Payment Method</label>
                        <select className="form-control" value={filters.payment_method} onChange={(e) => handleFilterChange('payment_method', e.target.value)}>
                            <option value="all">All Methods</option>
                            <option value="cash">Physical Cash</option>
                            <option value="card">Digital Card</option>
                            <option value="credit">Trade Credit</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>TEMPORAL FILTERS:</span>
                        <input type="date" className="form-control" style={{ width: '160px' }} value={filters.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
                        <span style={{ color: '#cbd5e1' }}>→</span>
                        <input type="date" className="form-control" style={{ width: '160px' }} value={filters.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
                    </div>
                    <button className="btn-cancel" style={{ width: 'auto', padding: '0.5rem 1.5rem' }} onClick={clearFilters}>Purge Filters</button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#6366f1' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Reconstructing transaction history...</p>
                </div>
            ) : (
                <div className="modern-table-container">
                    {sales.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
                            <h3 style={{ color: '#1e293b' }}>No archival records match</h3>
                            <p style={{ color: '#64748b' }}>Adjust filters or verify the selected date range.</p>
                        </div>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Ref ID</th>
                                    <th>Registry Date</th>
                                    <th>Center</th>
                                    <th>Entity</th>
                                    <th style={{ textAlign: 'right' }}>Valuation</th>
                                    <th style={{ textAlign: 'center' }}>Method</th>
                                    <th style={{ textAlign: 'center' }}>Classification</th>
                                    <th className="text-right">Audit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => (
                                    <tr key={sale.id}>
                                        <td><strong style={{ color: '#6366f1', letterSpacing: '0.05em' }}>{sale.invoice_number}</strong></td>
                                        <td>
                                            <div style={{ fontWeight: '700' }}>{new Date(sale.sale_date).toLocaleDateString()}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td><span style={{ padding: '4px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800' }}>{sale.shops?.name || 'CENTRAL'}</span></td>
                                        <td>
                                            <div style={{ fontWeight: '700' }}>{sale.customer_name || 'Generic Walk-in'}</div>
                                            {sale.customers?.phone && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>📞 {sale.customers.phone}</div>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '900', color: '#1e293b' }}>Rs. {parseFloat(sale.total_amount).toLocaleString()}</div>
                                            {sale.amount_due > 0 && <div style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: '700' }}>DUE: {parseFloat(sale.amount_due).toLocaleString()}</div>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{sale.payment_method}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: '800',
                                                background: sale.payment_status === 'paid' ? '#f0fdf4' : '#fffbeb',
                                                color: sale.payment_status === 'paid' ? '#16a34a' : '#d97706',
                                                border: `1px solid ${sale.payment_status === 'paid' ? '#dcfce7' : '#fef3c7'}`
                                            }}>{sale.payment_status.toUpperCase()}</span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }} onClick={() => viewSaleDetails(sale)}>Visualize</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Invoice Detail Modal */}
            {isModalOpen && selectedSale && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '850px', padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
                        <div style={{ background: '#1e293b', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900' }}>OFFICIAL INVOICE</h2>
                                <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.9rem' }}>Reference No: {selectedSale.invoice_number}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                        </div>

                        <div style={{ padding: '2.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
                                <div>
                                    <h4 style={{ textTransform: 'uppercase', color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Billing Information</h4>
                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '4px' }}>{selectedSale.customer_name || 'Retail Consumer'}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{selectedSale.customers?.phone || 'N/A'}</div>
                                    <div style={{ marginTop: '1rem' }}><span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>{selectedSale.payment_method.toUpperCase()} TRANSACTION</span></div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h4 style={{ textTransform: 'uppercase', color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Dispatch Registry</h4>
                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '4px' }}>{selectedSale.shops?.name || 'CENTRAL DEPOT'}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{new Date(selectedSale.sale_date).toLocaleString()}</div>
                                    <div style={{ marginTop: '1rem' }}><span style={{ padding: '4px 12px', background: selectedSale.payment_status === 'paid' ? '#dcfce7' : '#fee2e2', color: selectedSale.payment_status === 'paid' ? '#166534' : '#991b1b', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>{selectedSale.payment_status.toUpperCase()}</span></div>
                                </div>
                            </div>

                            <table className="modern-table" style={{ border: 'none' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ background: 'none' }}>Product Specifications</th>
                                        <th style={{ background: 'none', textAlign: 'center' }}>Qty</th>
                                        <th style={{ background: 'none', textAlign: 'right' }}>Unit Rate</th>
                                        <th style={{ background: 'none', textAlign: 'right' }}>Line Valuation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saleItems.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ padding: '1.25rem' }}>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{item.product_name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>SKU: {item.sku || 'N/A'}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', color: '#64748b' }}>Rs. {parseFloat(item.unit_price).toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '900' }}>Rs. {parseFloat(item.line_total).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ width: '300px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#64748b' }}>
                                        <span>Registry Subtotal</span>
                                        <span>Rs. {parseFloat(selectedSale.subtotal).toLocaleString()}</span>
                                    </div>
                                    {selectedSale.discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#16a34a', fontWeight: '700' }}>
                                            <span>Adjustment (Discount)</span>
                                            <span>- Rs. {parseFloat(selectedSale.discount).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', borderTop: '2px solid #f1f5f9', marginTop: '1rem' }}>
                                        <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>FINAL TOTAL</span>
                                        <span style={{ fontWeight: '900', fontSize: '1.5rem', color: '#1e293b' }}>Rs. {parseFloat(selectedSale.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                                        <span>Satisfied Amount</span>
                                        <span>Rs. {parseFloat(selectedSale.amount_paid).toLocaleString()}</span>
                                    </div>
                                    {selectedSale.amount_due > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#f43f5e', fontWeight: '900' }}>
                                            <span>Liquid Arrears (Due)</span>
                                            <span>Rs. {parseFloat(selectedSale.amount_due).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedSale.notes && (
                                <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fef3c7', fontSize: '0.85rem', color: '#92400e' }}>
                                    <strong>AUDIT REMARKS:</strong> {selectedSale.notes}
                                </div>
                            )}

                            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                                <button className="btn-primary" style={{ padding: '1rem 3rem' }} onClick={() => window.print()}>Authorize & Print Physical Invoice</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
