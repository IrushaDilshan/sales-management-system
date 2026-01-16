import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        commission_rate: 0,
        is_active: true
    });
    const [error, setError] = useState(null);
    const [itemCounts, setItemCounts] = useState({});

    useEffect(() => {
        fetchCategories();
        fetchItemCounts();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const fetchItemCounts = async () => {
        try {
            const { data, error } = await supabase
                .from('items')
                .select('category_id');

            if (error) throw error;

            // Count items per category
            const counts = {};
            data.forEach(item => {
                const catId = item.category_id;
                counts[catId] = (counts[catId] || 0) + 1;
            });
            setItemCounts(counts);
        } catch (err) {
            console.error('Error fetching item counts:', err);
        }
    };

    const handleOpenModal = (category = null) => {
        if (category) {
            setFormData({
                id: category.id,
                name: category.name || '',
                description: category.description || '',
                commission_rate: category.commission_rate || 0,
                is_active: category.is_active !== false
            });
        } else {
            setFormData({
                id: null,
                name: '',
                description: '',
                commission_rate: 0,
                is_active: true
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
            commission_rate: 0,
            is_active: true
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
                description: formData.description,
                commission_rate: parseFloat(formData.commission_rate) || 0,
                is_active: formData.is_active
            };

            let submitError;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('product_categories')
                    .update(updates)
                    .eq('id', formData.id);
                submitError = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('product_categories')
                    .insert([updates]);
                submitError = insertError;
            }

            if (submitError) throw submitError;

            fetchCategories();
            fetchItemCounts();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleActive = async (category) => {
        try {
            const { error } = await supabase
                .from('product_categories')
                .update({ is_active: !category.is_active })
                .eq('id', category.id);

            if (error) throw error;
            fetchCategories();
        } catch (err) {
            console.error('Error toggling category:', err);
            alert('Failed to update category status');
        }
    };

    const handleDelete = async (id) => {
        const itemCount = itemCounts[id] || 0;

        if (itemCount > 0) {
            alert(`Cannot delete this category. It has ${itemCount} product(s) assigned to it. Please reassign or delete those products first.`);
            return;
        }

        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                const { error } = await supabase
                    .from('product_categories')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchCategories();
                fetchItemCounts();
            } catch (err) {
                console.error('Error deleting category:', err);
                alert('Failed to delete category');
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Product Categories</h1>
                    <p className="page-subtitle">Manage NLDB's 8 main product categories</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Category
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <div className="modern-table-container">
                        {categories.length === 0 ? (
                            <div className="empty-state">
                                <h3>No categories found</h3>
                                <p>Click "Add Category" to create your first product category.</p>
                            </div>
                        ) : (
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Category Name</th>
                                        <th>Description</th>
                                        <th style={{ textAlign: 'center' }}>Products</th>
                                        <th style={{ textAlign: 'center' }}>Commission %</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((category) => (
                                        <tr key={category.id}>
                                            <td>
                                                <strong>{category.name}</strong>
                                            </td>
                                            <td style={{ maxWidth: '300px' }}>
                                                {category.description || '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge badge-info">
                                                    {itemCounts[category.id] || 0} items
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {category.commission_rate}%
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {category.is_active ? (
                                                    <span className="badge badge-success">Active</span>
                                                ) : (
                                                    <span className="badge badge-secondary">Inactive</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className={`action-btn ${category.is_active ? 'btn-secondary' : 'btn-success'}`}
                                                    onClick={() => handleToggleActive(category)}
                                                    style={{ marginRight: '0.5rem' }}
                                                >
                                                    {category.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    className="action-btn btn-edit"
                                                    onClick={() => handleOpenModal(category)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="action-btn btn-delete"
                                                    onClick={() => handleDelete(category.id)}
                                                    disabled={itemCounts[category.id] > 0}
                                                    title={itemCounts[category.id] > 0 ? 'Cannot delete - has products assigned' : 'Delete category'}
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
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit Category' : 'Add New Category'}
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
                            <div className="form-group">
                                <label className="form-label">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g., Breeding Stock, Milk Products"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Brief description of this category"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Commission Rate (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    name="commission_rate"
                                    value={formData.commission_rate}
                                    onChange={handleInputChange}
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="0.0"
                                />
                                <small style={{ color: '#666', fontSize: '0.875rem' }}>
                                    Commission percentage for sales representatives
                                </small>
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
                                    <span>Active (users can select this category)</span>
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;
