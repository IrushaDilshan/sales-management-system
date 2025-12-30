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

    useEffect(() => {
        fetchCustomers();
    }, []);

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

    // Filter customers
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

    const getCustomerTypeBadgeClass = (type) => {
        const classes = {
            individual: 'badge-info',
            retailer: 'badge-success',
            government: 'badge-warning',
            institution: 'badge-secondary'
        };
        return classes[type] || 'badge-info';
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customer Management</h1>
                    <p className="page-subtitle">Manage NLDB customers - farmers, retailers, institutions</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Customer
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ minWidth: '180px' }}>
                    <select
                        className="form-input"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="all">All Customer Types</option>
                        <option value="individual">Individual</option>
                        <option value="retailer">Retailer</option>
                        <option value="government">Government</option>
                        <option value="institution">Institution</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    {filteredCustomers.length === 0 ? (
                        <div className="empty-state">
                            <h3>No customers found</h3>
                            <p>{searchTerm || filterType !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Click "Add Customer" to create your first customer.'}</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Type</th>
                                    <th>Contact</th>
                                    <th style={{ textAlign: 'right' }}>Credit Limit</th>
                                    <th style={{ textAlign: 'center' }}>Payment Terms</th>
                                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td>
                                            <strong>{customer.name}</strong>
                                            {customer.contact_person && (
                                                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                                                    Contact: {customer.contact_person}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${getCustomerTypeBadgeClass(customer.customer_type)}`}>
                                                {getCustomerTypeLabel(customer.customer_type)}
                                            </span>
                                        </td>
                                        <td>
                                            {customer.phone && (
                                                <div style={{ fontSize: '0.875rem' }}>📞 {customer.phone}</div>
                                            )}
                                            {customer.email && (
                                                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                                    ✉️ {customer.email}
                                                </div>
                                            )}
                                            {!customer.phone && !customer.email && '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {customer.credit_limit > 0
                                                ? `Rs. ${parseFloat(customer.credit_limit).toLocaleString()}`
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {customer.credit_days > 0
                                                ? `Net ${customer.credit_days} days`
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {customer.outstanding_balance > 0 ? (
                                                <strong style={{ color: 'var(--danger-color)' }}>
                                                    Rs. {parseFloat(customer.outstanding_balance).toLocaleString()}
                                                </strong>
                                            ) : (
                                                <span style={{ color: '#999' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {customer.is_active ? (
                                                <span className="badge badge-success">Active</span>
                                            ) : (
                                                <span className="badge badge-secondary">Inactive</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="action-btn btn-edit"
                                                onClick={() => handleOpenModal(customer)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="action-btn btn-delete"
                                                onClick={() => handleDelete(customer.id)}
                                            >
                                                Delete
                                            </button>
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
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit Customer' : 'Add New Customer'}
                        </h2>

                        {error && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Basic Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151' }}>
                                    Basic Information
                                </h3>

                                <div className="form-group">
                                    <label className="form-label">Customer Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g., John Doe, ABC Retailers, Ministry of Agriculture"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Customer Type *</label>
                                    <select
                                        className="form-input"
                                        name="customer_type"
                                        value={formData.customer_type}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="individual">Individual (Farmer/Consumer)</option>
                                        <option value="retailer">Retailer (Shop/Business)</option>
                                        <option value="government">Government (Ministry/Department)</option>
                                        <option value="institution">Institution (School/Hospital)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Contact Person</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="contact_person"
                                        value={formData.contact_person}
                                        onChange={handleInputChange}
                                        placeholder="Name of contact person"
                                    />
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151' }}>
                                    Contact Information
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="07X XXX XXXX"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <textarea
                                        className="form-input"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        rows="2"
                                        placeholder="Street address"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Colombo, Kandy, Galle"
                                    />
                                </div>
                            </div>

                            {/* Credit Terms */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151' }}>
                                    Credit Terms
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Credit Limit (Rs.)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            name="credit_limit"
                                            value={formData.credit_limit}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="100"
                                            placeholder="0"
                                        />
                                        <small style={{ color: '#666', fontSize: '0.875rem' }}>
                                            Maximum credit allowed
                                        </small>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Payment Terms (Days)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            name="credit_days"
                                            value={formData.credit_days}
                                            onChange={handleInputChange}
                                            min="0"
                                            placeholder="0"
                                        />
                                        <small style={{ color: '#666', fontSize: '0.875rem' }}>
                                            e.g., Net 30, Net 60
                                        </small>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-input"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows="2"
                                        placeholder="Additional notes about this customer"
                                    />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleInputChange}
                                            style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                                        />
                                        <span>Active customer</span>
                                    </label>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create Customer'}
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
