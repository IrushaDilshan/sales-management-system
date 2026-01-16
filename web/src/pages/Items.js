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
        shelf_life_days: '',
        image_url: ''
    });
    const [error, setError] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        categories: 0,
        perishables: 0,
        avgPrice: 0
    });

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [items]);

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

    const calculateStats = () => {
        const s = {
            total: items.length,
            categories: new Set(items.map(i => i.category_id).filter(Boolean)).size,
            perishables: items.filter(i => i.is_perishable).length,
            avgPrice: items.length > 0 ? items.reduce((sum, i) => sum + (parseFloat(i.retail_price) || 0), 0) / items.length : 0
        };
        setStats(s);
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
                shelf_life_days: item.shelf_life_days || '',
                image_url: item.image_url || ''
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
                shelf_life_days: '',
                image_url: ''
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
            shelf_life_days: '',
            image_url: ''
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
                shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : null,
                image_url: formData.image_url || null
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

    const filteredItems = items.filter(item => {
        const matchesCategory = filterCategory === 'all' || item.category_id?.toString() === filterCategory;
        const matchesSearch = searchTerm === '' ||
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

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
                    {value} {suffix}
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Master Catalog</h1>
                    <p className="page-subtitle">National Livestock Development Board - Product SKU Management</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span>+</span> Register New SKU
                </button>
            </div>

            {/* Stats Dashboard */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard icon="🏷️" label="Total Products" value={stats.total} color="#6366f1" />
                <StatCard icon="📂" label="Active Categories" value={stats.categories} color="#10b981" />
                <StatCard icon="🍎" label="Perishables" value={stats.perishables} color="#f59e0b" />
                <StatCard icon="📈" label="Avg Retail Price" value={stats.avgPrice.toFixed(2)} suffix="Rs." color="#ec4899" />
            </div>

            {/* Advanced Filters */}
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
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Search Catalog</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by product name, SKU code, or barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ width: '250px' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Product Category</label>
                    <select
                        className="form-control"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Product Lines</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1.5rem', color: '#64748b' }}>Awaiting cloud catalog synchronization...</p>
                </div>
            ) : (
                <div className="modern-table-container">
                    {filteredItems.length === 0 ? (
                        <div style={{ padding: '5rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                            <h3 style={{ color: '#1e293b' }}>No products found in catalog</h3>
                            <p style={{ color: '#64748b' }}>Try adjusting filters or register a new SKU.</p>
                        </div>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Product Identity</th>
                                    <th>Category</th>
                                    <th>Identifier (SKU)</th>
                                    <th style={{ textAlign: 'right' }}>Wholesale (Rs.)</th>
                                    <th style={{ textAlign: 'right' }}>Retail (Rs.)</th>
                                    <th style={{ textAlign: 'center' }}>Unit</th>
                                    <th style={{ textAlign: 'center' }}>Perishability</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            {item.image_url && (
                                                <img
                                                    src={item.image_url}
                                                    alt="Preview"
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', float: 'left', marginRight: '10px' }}
                                                />
                                            )}
                                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
                                            {item.description && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {item.product_categories ? (
                                                <span style={{ padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                    {item.product_categories.name}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#334155' }}>
                                                {item.sku || '-'}
                                            </code>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                            {item.wholesale_price ? parseFloat(item.wholesale_price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
                                            {item.retail_price ? parseFloat(item.retail_price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>{item.unit_of_measure}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {item.is_perishable ? (
                                                <span style={{ padding: '2px 8px', background: '#fffbeb', color: '#92400e', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>⚠️ PERISHABLE</span>
                                            ) : (
                                                <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#94a3b8', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>STABLE</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(item)}>Edit</button>
                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: '#fee2e2', color: '#ef4444' }} onClick={() => handleDelete(item.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )
            }

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-fade" style={{ maxWidth: '600px', borderRadius: '24px', padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                                    {formData.id ? 'Edit Product' : 'Add New Product'}
                                </h2>
                                <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                            </div>

                            {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600', fontSize: '0.9rem' }}>{error}</div>}

                            <form onSubmit={handleSubmit}>
                                {/* Top Section: Image Preview & Essential Info */}
                                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    {/* Image Upload / URL Area */}
                                    <div style={{ width: '120px', flexShrink: 0 }}>
                                        <div style={{
                                            width: '120px',
                                            height: '120px',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            background: '#f1f5f9',
                                            border: '2px dashed #cbd5e1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative'
                                        }}>
                                            {formData.image_url ? (
                                                <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                            ) : (
                                                <span style={{ fontSize: '2rem', color: '#cbd5e1' }}>📷</span>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="image_url"
                                                value={formData.image_url}
                                                onChange={handleInputChange}
                                                placeholder="Paste Image URL..."
                                                style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Main Details */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Product Name</label>
                                            <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Fresh Milk 1L" style={{ fontWeight: '600' }} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Category</label>
                                            <select className="form-control" name="category_id" value={formData.category_id} onChange={handleInputChange} required>
                                                <option value="">Select Category...</option>
                                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Description (Clean & Simple) */}
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Short Description</label>
                                    <textarea className="form-control" name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="Brief details about the product..." style={{ fontSize: '0.9rem' }} />
                                </div>

                                {/* Pricing & Units Grid */}
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Retail Price (Rs.)</label>
                                            <input type="number" className="form-control" name="retail_price" value={formData.retail_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#6366f1' }} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Wholesale Price (Rs.)</label>
                                            <input type="number" className="form-control" name="wholesale_price" value={formData.wholesale_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Unit</label>
                                            <select className="form-control" name="unit_of_measure" value={formData.unit_of_measure} onChange={handleInputChange}>
                                                <option value="piece">Piece</option>
                                                <option value="kg">Kg</option>
                                                <option value="liter">Liter</option>
                                                <option value="pack">Pack</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', paddingBottom: '0.5rem' }}>
                                                <input type="checkbox" name="is_perishable" checked={formData.is_perishable} onChange={handleInputChange} style={{ marginRight: '0.5rem', width: '16px', height: '16px' }} />
                                                Perishable Item?
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Collapsible/Hidden Advanced Fields (SKU/Barcode) - keeping them reachable but hidden by default concept, or just simplified side-by-side at bottom if essential */}
                                <details style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    <summary style={{ cursor: 'pointer', padding: '0.5rem 0' }}>Advanced Options (SKU, IDs)</summary>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', padding: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                        <div className="form-group">
                                            <label className="form-label">SKU Code</label>
                                            <input type="text" className="form-control" name="sku" value={formData.sku} onChange={handleInputChange} placeholder="Auto-generated if empty" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Barcode</label>
                                            <input type="text" className="form-control" name="barcode" value={formData.barcode} onChange={handleInputChange} placeholder="Scan Barcode" />
                                        </div>
                                    </div>
                                </details>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn-cancel" style={{ flex: 1, padding: '0.8rem' }} onClick={handleCloseModal}>Cancel</button>
                                    <button type="submit" className="btn-primary" style={{ flex: 2, padding: '0.8rem', fontSize: '1rem' }}>
                                        {formData.id ? 'Save Changes' : 'Create Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </div >
    );
};

export default Items;
