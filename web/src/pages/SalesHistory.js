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
            // Fetch outlets
            const { data: outletsData } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            // Fetch customers
            const { data: customersData } = await supabase
                .from('customers')
                .select('*')
                .order('name');

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

            // Apply filters
            if (filters.outlet_id !== 'all') {
                query = query.eq('outlet_id', filters.outlet_id);
            }

            if (filters.customer_id !== 'all') {
                query = query.eq('customer_id', filters.customer_id);
            }

            if (filters.payment_status !== 'all') {
                query = query.eq('payment_status', filters.payment_status);
            }

            if (filters.payment_method !== 'all') {
                query = query.eq('payment_method', filters.payment_method);
            }

            if (filters.date_from) {
                query = query.gte('sale_date', filters.date_from);
            }

            if (filters.date_to) {
                const toDate = new Date(filters.date_to);
                toDate.setHours(23, 59, 59, 999);
                query = query.lte('sale_date', toDate.toISOString());
            }

            if (filters.search) {
                query = query.or(`invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
            }

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
            const { data, error } = await supabase
                .from('sale_items')
                .select('*')
                .eq('sale_id', sale.id);

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
            outlet_id: 'all',
            customer_id: 'all',
            payment_status: 'all',
            payment_method: 'all',
            date_from: '',
            date_to: '',
            search: ''
        });
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            paid: { class: 'badge-success', label: 'Paid' },
            pending: { class: 'badge-warning', label: 'Pending' },
            partial: { class: 'badge-info', label: 'Partial' },
            overdue: { class: 'badge-danger', label: 'Overdue' }
        };
        return badges[status] || { class: 'badge-secondary', label: status };
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            cash: 'Cash',
            card: 'Card',
            credit: 'Credit',
            bank_transfer: 'Bank Transfer'
        };
        return methods[method] || method;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales History</h1>
                    <p className="page-subtitle">View and analyze all sales transactions</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Total Sales
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {stats.total_sales}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Total Revenue
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                        Rs. {stats.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Amount Collected
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                        Rs. {stats.total_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Outstanding
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                        Rs. {stats.total_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Filters</h3>
                    <button className="btn-cancel" onClick={clearFilters} style={{ padding: '0.5rem 1rem' }}>
                        Clear Filters
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Search Invoice/Customer</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Invoice number or customer name"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Outlet</label>
                        <select
                            className="form-input"
                            value={filters.outlet_id}
                            onChange={(e) => handleFilterChange('outlet_id', e.target.value)}
                        >
                            <option value="all">All Outlets</option>
                            {outlets.map(outlet => (
                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Customer</label>
                        <select
                            className="form-input"
                            value={filters.customer_id}
                            onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                        >
                            <option value="all">All Customers</option>
                            {customers.map(customer => (
                                <option key={customer.id} value={customer.id}>{customer.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payment Status</label>
                        <select
                            className="form-input"
                            value={filters.payment_status}
                            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payment Method</label>
                        <select
                            className="form-input"
                            value={filters.payment_method}
                            onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                        >
                            <option value="all">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date From</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.date_from}
                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date To</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.date_to}
                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    {sales.length === 0 ? (
                        <div className="empty-state">
                            <h3>No sales found</h3>
                            <p>Try adjusting your filters or make some sales!</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Date</th>
                                    <th>Outlet</th>
                                    <th>Customer</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Payment</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => {
                                    const statusBadge = getPaymentStatusBadge(sale.payment_status);
                                    return (
                                        <tr key={sale.id}>
                                            <td>
                                                <strong style={{ color: '#3b82f6' }}>{sale.invoice_number}</strong>
                                            </td>
                                            <td>
                                                {new Date(sale.sale_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                                    {new Date(sale.sale_date).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td>
                                                {sale.shops ? (
                                                    <span className="badge badge-info">{sale.shops.name}</span>
                                                ) : (
                                                    <span style={{ color: '#999' }}>-</span>
                                                )}
                                            </td>
                                            <td>
                                                {sale.customer_name || 'Walk-in'}
                                                {sale.customers?.phone && (
                                                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                                        {sale.customers.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <strong>Rs. {parseFloat(sale.total_amount).toFixed(2)}</strong>
                                                {sale.amount_due > 0 && (
                                                    <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                                                        Due: Rs. {parseFloat(sale.amount_due).toFixed(2)}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge badge-secondary">
                                                    {getPaymentMethodLabel(sale.payment_method)}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`badge ${statusBadge.class}`}>
                                                    {statusBadge.label}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="action-btn btn-secondary"
                                                    onClick={() => viewSaleDetails(sale)}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Sale Details Modal */}
            {isModalOpen && selectedSale && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0 }}>Invoice: {selectedSale.invoice_number}</h2>
                                <p style={{ color: '#666', marginTop: '0.5rem' }}>
                                    {new Date(selectedSale.sale_date).toLocaleString()}
                                </p>
                            </div>
                            <button
                                className="btn-cancel"
                                onClick={() => setIsModalOpen(false)}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Close
                            </button>
                        </div>

                        {/* Sale Header Info */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            padding: '1rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666' }}>Customer</div>
                                <div style={{ fontWeight: 'bold' }}>{selectedSale.customer_name || 'Walk-in Customer'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666' }}>Outlet</div>
                                <div style={{ fontWeight: 'bold' }}>{selectedSale.shops?.name || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666' }}>Payment Method</div>
                                <div style={{ fontWeight: 'bold' }}>{getPaymentMethodLabel(selectedSale.payment_method)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666' }}>Status</div>
                                <div>
                                    <span className={`badge ${getPaymentStatusBadge(selectedSale.payment_status).class}`}>
                                        {getPaymentStatusBadge(selectedSale.payment_status).label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sale Items */}
                        <h3 style={{ marginBottom: '1rem' }}>Items</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th style={{ textAlign: 'center' }}>Quantity</th>
                                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {saleItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>{item.product_name}</strong>
                                            {item.sku && (
                                                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                                    SKU: {item.sku}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>Rs. {parseFloat(item.unit_price).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <strong>Rs. {parseFloat(item.line_total).toFixed(2)}</strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1rem',
                            borderTop: '2px solid #e5e7eb'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Subtotal:</span>
                                <span>Rs. {parseFloat(selectedSale.subtotal).toFixed(2)}</span>
                            </div>

                            {selectedSale.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#059669' }}>
                                    <span>Discount:</span>
                                    <span>- Rs. {parseFloat(selectedSale.discount).toFixed(2)}</span>
                                </div>
                            )}

                            {selectedSale.tax > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Tax:</span>
                                    <span>+ Rs. {parseFloat(selectedSale.tax).toFixed(2)}</span>
                                </div>
                            )}

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '2px solid #e5e7eb'
                            }}>
                                <span>TOTAL:</span>
                                <span>Rs. {parseFloat(selectedSale.total_amount).toFixed(2)}</span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '0.5rem',
                                color: '#059669'
                            }}>
                                <span>Amount Paid:</span>
                                <span>Rs. {parseFloat(selectedSale.amount_paid).toFixed(2)}</span>
                            </div>

                            {selectedSale.amount_due > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '0.5rem',
                                    color: '#dc2626',
                                    fontWeight: 'bold'
                                }}>
                                    <span>Amount Due:</span>
                                    <span>Rs. {parseFloat(selectedSale.amount_due).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {selectedSale.notes && (
                            <div style={{
                                marginTop: '1.5rem',
                                padding: '1rem',
                                backgroundColor: '#fef3c7',
                                borderRadius: '0.5rem'
                            }}>
                                <strong>Notes:</strong> {selectedSale.notes}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
