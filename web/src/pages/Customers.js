import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        customer_type: 'individual',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        credit_limit: 0,
        credit_days: 0,
        is_active: true,
        notes: ''
    });
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        corporate: 0,
        outstanding: 0
    });

    useEffect(() => {
        fetchCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        calculateStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customers]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error) throw error;
            setCustomers(data || []);
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const s = {
            total: customers.length,
            active: customers.filter(c => c.is_active).length,
            corporate: customers.filter(c => c.customer_type !== 'individual').length,
            outstanding: customers.reduce((sum, c) => sum + (parseFloat(c.outstanding_balance) || 0), 0)
        };
        setStats(s);
    };

    const handleOpenModal = (customer = null) => {
        if (customer) {
            setFormData({
                id: customer.id,
                name: customer.name || '',
                customer_type: customer.customer_type || 'individual',
                contact_person: customer.contact_person || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                city: customer.city || '',
                credit_limit: customer.credit_limit || 0,
                credit_days: customer.credit_days || 0,
                is_active: customer.is_active !== false,
                notes: customer.notes || ''
            });
        } else {
            setFormData({
                id: null,
                name: '',
                customer_type: 'individual',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                credit_limit: 0,
                credit_days: 0,
                is_active: true,
                notes: ''
            });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            id: null,
            name: '',
            customer_type: 'individual',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            credit_limit: 0,
            credit_days: 0,
            is_active: true,
            notes: ''
        });
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updates = {
                name: formData.name,
                customer_type: formData.customer_type,
                contact_person: formData.contact_person || null,
                phone: formData.phone || null,
                email: formData.email || null,
                address: formData.address || null,
                city: formData.city || null,
                credit_limit: parseFloat(formData.credit_limit) || 0,
                credit_days: parseInt(formData.credit_days) || 0,
                is_active: formData.is_active,
                notes: formData.notes || null
            };

            let submitError;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('customers')
                    .update(updates)
                    .eq('id', formData.id);
                submitError = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('customers')
                    .insert([updates]);
                submitError = insertError;
            }

            if (submitError) throw submitError;

            fetchCustomers();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchCustomers();
            } catch (err) {
                console.error('Error deleting customer:', err);
                alert('Failed to delete customer. They may have existing sales.');
            }
        }
    };

    const filteredCustomers = customers.filter(customer => {
        const matchesType = filterType === 'all' || customer.customer_type === filterType;
        const matchesSearch = searchTerm === '' ||
            customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone?.includes(searchTerm) ||
            customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getCustomerTypeLabel = (type) => {
        const types = {
            individual: 'Individual',
            retailer: 'Retailer',
            government: 'Government',
            institution: 'Institution'
        };
        return types[type] || type;
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
            <div style={{
                fontSize: '2rem',
                background: `${color}10`,
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px'
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                    {suffix} {value}
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Entity Directory</h1>
                    <p className="page-subtitle">National Livestock Development Board - Farmer & Retailer Management</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span>+</span> Register New Customer
                </button>
            </div>

            {/* Stats Dashboard */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard icon="👥" label="Total Registered" value={stats.total} color="#6366f1" />
                <StatCard icon="✅" label="Active Partners" value={stats.active} color="#10b981" />
                <StatCard icon="🏢" label="Corporate Entities" value={stats.corporate} color="#f59e0b" />
                <StatCard icon="💰" label="Total Outstanding" value={stats.outstanding.toLocaleString()} suffix="Rs." color="#ef4444" />
            </div>

            {/* Filter Card */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '16px',
                marginBottom: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end'
            }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Search Records</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, phone, or email identity..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ width: '250px' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Classification</label>
                    <select
                        className="form-control"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Classifications</option>
                        <option value="individual">Individual / Consumer</option>
                        <option value="retailer">Retail Outlet / SME</option>
                        <option value="government">Government Body</option>
                        <option value="institution">Educational / Healthcare</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1.5rem', color: '#64748b' }}>Pulling latest directory data...</p>
                </div>
            ) : (
                <div className="table-container">
                    {filteredCustomers.length === 0 ? (
                        <div style={{ padding: '5rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔎</div>
                            <h3 style={{ color: '#1e293b' }}>No entities found</h3>
                            <p style={{ color: '#64748b' }}>Try different search terms or register a new entity.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer Identity</th>
                                    <th>Classification</th>
                                    <th>Point of Contact</th>
                                    <th style={{ textAlign: 'right' }}>Credit Facility</th>
                                    <th style={{ textAlign: 'right' }}>Dues (Rs.)</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th className="text-right">Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{customer.name}</div>
                                            {customer.city && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                    📍 {customer.city}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                backgroundColor:
                                                    customer.customer_type === 'individual' ? '#eff6ff' :
                                                        customer.customer_type === 'retailer' ? '#ecfdf5' :
                                                            customer.customer_type === 'government' ? '#fffbeb' : '#f5f3ff',
                                                color:
                                                    customer.customer_type === 'individual' ? '#1d4ed8' :
                                                        customer.customer_type === 'retailer' ? '#059669' :
                                                            customer.customer_type === 'government' ? '#b45309' : '#6d28d9',
                                            }}>
                                                {getCustomerTypeLabel(customer.customer_type)}
                                            </span>
                                        </td>
                                        <td>
                                            {customer.phone && <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>📞 {customer.phone}</div>}
                                            {customer.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>✉️ {customer.email}</div>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {customer.credit_limit > 0 ? (
                                                <div>
                                                    <div style={{ fontWeight: '700' }}>Rs. {parseFloat(customer.credit_limit).toLocaleString()}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{customer.credit_days} Days limit</div>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Full Advance</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {customer.outstanding_balance > 0 ? (
                                                <div style={{ fontWeight: '800', color: '#ef4444' }}>
                                                    Rs. {parseFloat(customer.outstanding_balance).toLocaleString()}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#10b981', fontWeight: '700' }}>CLEAR</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {customer.is_active ? (
                                                <span style={{ padding: '4px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid #dcfce7' }}>ACTIVE</span>
                                            ) : (
                                                <span style={{ padding: '4px 12px', background: '#f8fafc', color: '#94a3b8', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid #e2e8f0' }}>INACTIVE</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(customer)}>Review</button>
                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: '#fee2e2', color: '#ef4444' }} onClick={() => handleDelete(customer.id)}>Archive</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                                {formData.id ? 'Modify Entity Profile' : 'Register New Entity'}
                            </h2>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                        </div>

                        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600' }}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Full Legal Name / Business Name *</label>
                                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="NLDB Registered Entity Name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Classification *</label>
                                    <select className="form-control" name="customer_type" value={formData.customer_type} onChange={handleInputChange} required>
                                        <option value="individual">Individual Consumer</option>
                                        <option value="retailer">Certified Retailer</option>
                                        <option value="government">Government Agency</option>
                                        <option value="institution">Private Institution</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Primary Phone</label>
                                    <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="0XX-XXXXXXX" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Identity</label>
                                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} placeholder="official@domain.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Active City</label>
                                    <input type="text" className="form-control" name="city" value={formData.city} onChange={handleInputChange} placeholder="Region" />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Physical Registered Address</label>
                                <textarea className="form-control" name="address" value={formData.address} onChange={handleInputChange} rows="2" placeholder="Complete mailing address" />
                            </div>

                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Governance</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Credit Authorization (Rs.)</label>
                                        <input type="number" className="form-control" name="credit_limit" value={formData.credit_limit} onChange={handleInputChange} min="0" step="1000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Settlement Period (Days)</label>
                                        <input type="number" className="form-control" name="credit_days" value={formData.credit_days} onChange={handleInputChange} min="0" />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Internal Audit Notes</label>
                                <textarea className="form-control" name="notes" value={formData.notes} onChange={handleInputChange} rows="2" placeholder="Special arrangements or history..." />
                            </div>

                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '700', color: formData.is_active ? '#10b981' : '#64748b' }}>
                                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} style={{ marginRight: '0.8rem', width: '20px', height: '20px' }} />
                                    <span>AUTHORIZED STATUS (Enable for sales operations)</span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={handleCloseModal}>Discard</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                                    {formData.id ? 'Execute Profile Update' : 'Authorize Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
