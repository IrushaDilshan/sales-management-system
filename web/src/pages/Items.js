import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Items = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        category_id: '',
        sku: '',
        barcode: '',
        wholesale_price: '',
        retail_price: '',
        unit_of_measure: 'piece',
        is_perishable: false,
        shelf_life_days: ''
    });
    const [error, setError] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (
                        id,
                        name
                    )
                `)
                .order('name');

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Error fetching items:', err);
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setFormData({
                id: item.id,
                name: item.name || '',
                description: item.description || '',
                category_id: item.category_id || '',
                sku: item.sku || '',
                barcode: item.barcode || '',
                wholesale_price: item.wholesale_price || '',
                retail_price: item.retail_price || '',
                unit_of_measure: item.unit_of_measure || 'piece',
                is_perishable: item.is_perishable || false,
                shelf_life_days: item.shelf_life_days || ''
            });
        } else {
            setFormData({
                id: null,
                name: '',
                description: '',
                category_id: '',
                sku: '',
                barcode: '',
                wholesale_price: '',
                retail_price: '',
                unit_of_measure: 'piece',
                is_perishable: false,
                shelf_life_days: ''
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
            description: '',
            category_id: '',
            sku: '',
            barcode: '',
            wholesale_price: '',
            retail_price: '',
            unit_of_measure: 'piece',
            is_perishable: false,
            shelf_life_days: ''
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
                description: formData.description || null,
                category_id: formData.category_id || null,
                sku: formData.sku || null,
                barcode: formData.barcode || null,
                wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
                retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
                unit_of_measure: formData.unit_of_measure,
                is_perishable: formData.is_perishable,
                shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : null
            };

            let submitError;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('items')
                    .update(updates)
                    .eq('id', formData.id);
                submitError = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('items')
                    .insert([updates]);
                submitError = insertError;
            }

            if (submitError) throw submitError;

            fetchItems();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                const { error } = await supabase
                    .from('items')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchItems();
            } catch (err) {
                console.error('Error deleting item:', err);
                alert('Failed to delete item');
            }
        }
    };

    // Filter items based on category and search
    const filteredItems = items.filter(item => {
        const matchesCategory = filterCategory === 'all' || item.category_id?.toString() === filterCategory;
        const matchesSearch = searchTerm === '' ||
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Product Management</h1>
                    <p className="page-subtitle">Manage NLDB products across all categories</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Product
                </button>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name, SKU, or barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ minWidth: '200px' }}>
                    <select
                        className="form-input"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    {filteredItems.length === 0 ? (
                        <div className="empty-state">
                            <h3>No products found</h3>
                            <p>{searchTerm || filterCategory !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Click "Add Product" to create your first product.'}</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>SKU</th>
                                    <th style={{ textAlign: 'right' }}>Wholesale</th>
                                    <th style={{ textAlign: 'right' }}>Retail</th>
                                    <th style={{ textAlign: 'center' }}>Unit</th>
                                    <th style={{ textAlign: 'center' }}>Perishable</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id || Math.random()}>
                                        <td>
                                            <strong>{item.name}</strong>
                                            {item.description && (
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: '#666',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    {item.description.length > 50
                                                        ? item.description.substring(0, 50) + '...'
                                                        : item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {item.product_categories ? (
                                                <span className="badge badge-info">
                                                    {item.product_categories.name}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#999' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <code style={{
                                                backgroundColor: '#f3f4f6',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.875rem'
                                            }}>
                                                {item.sku || '-'}
                                            </code>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {item.wholesale_price
                                                ? `Rs. ${parseFloat(item.wholesale_price).toFixed(2)}`
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {item.retail_price
                                                ? `Rs. ${parseFloat(item.retail_price).toFixed(2)}`
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {item.unit_of_measure || 'piece'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {item.is_perishable ? (
                                                <span className="badge badge-warning">
                                                    Yes ({item.shelf_life_days || '?'} days)
                                                </span>
                                            ) : (
                                                <span className="badge badge-secondary">No</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="action-btn btn-edit" onClick={() => handleOpenModal(item)}>
                                                Edit
                                            </button>
                                            <button className="action-btn btn-delete" onClick={() => handleDelete(item.id)}>
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

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit Product' : 'Add New Product'}
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
                                    <label className="form-label">Product Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g., Fresh Milk, Broiler Chick, Coconut Oil"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="2"
                                        placeholder="Brief description of the product"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input"
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Product Identification */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151' }}>
                                    Product Identification
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">SKU (Stock Code)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="sku"
                                            value={formData.sku}
                                            onChange={handleInputChange}
                                            placeholder="e.g., MILK-001"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Barcode</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="barcode"
                                            value={formData.barcode}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 1234567890123"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151' }}>
                                    Pricing & Unit
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Wholesale Price (Rs.)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            name="wholesale_price"
                                            value={formData.wholesale_price}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Retail Price (Rs.)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            name="retail_price"
                                            value={formData.retail_price}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Unit of Measure</label>
                                    <select
                                        className="form-input"
                                        name="unit_of_measure"
                                        value={formData.unit_of_measure}
                                        onChange={handleInputChange}
                                    >
                                        <option value="piece">Piece</option>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="g">Gram (g)</option>
                                        <option value="liter">Liter</option>
                                        <option value="ml">Milliliter (ml)</option>
                                        <option value="dozen">Dozen</option>
                                        <option value="pack">Pack</option>
                                        <option value="bottle">Bottle</option>
                                        <option value="box">Box</option>
                                    </select>
                                </div>
                            </div>

                            {/* Perishability */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151' }}>
                                    Storage & Perishability
                                </h3>

                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="is_perishable"
                                            checked={formData.is_perishable}
                                            onChange={handleInputChange}
                                            style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                                        />
                                        <span>This product is perishable (requires expiry tracking)</span>
                                    </label>
                                </div>

                                {formData.is_perishable && (
                                    <div className="form-group">
                                        <label className="form-label">Shelf Life (days)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            name="shelf_life_days"
                                            value={formData.shelf_life_days}
                                            onChange={handleInputChange}
                                            min="1"
                                            placeholder="e.g., 7 for dairy, 30 for eggs"
                                        />
                                        <small style={{ color: '#666', fontSize: '0.875rem' }}>
                                            How many days before this product expires?
                                        </small>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Items;
