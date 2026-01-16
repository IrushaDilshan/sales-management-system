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
        <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="stat-icon" style={{ color: color }}>{icon}</div>
            <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
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
                {/* Advanced Filters */}
                <div className="registry-filter-hub" style={{
                    marginBottom: '2rem',
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
                            <div className="empty-state">
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                                <h3 style={{ color: '#f8fafc' }}>No products found in catalog</h3>
                                <p style={{ color: '#94a3b8' }}>Try adjusting filters or register a new SKU.</p>
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
                                                <div style={{ fontWeight: '700', color: '#f8fafc' }}>{item.name}</div>
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
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-fade" style={{ maxWidth: '800px', width: '90%', borderRadius: '24px', padding: '2.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc' }}>
                                        {formData.id ? 'Edit Product' : 'Add New Product'}
                                    </h2>
                                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Manage catalog details and pricing.</p>
                                </div>
                                <button onClick={handleCloseModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>

                            {error && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600', fontSize: '0.9rem', border: '1px solid #fecaca' }}>{error}</div>}

                            <form onSubmit={handleSubmit}>
                                {/* Layout: Left (Image) - Right (Details) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', marginBottom: '2rem' }}>

                                    {/* Image Uploader Section */}
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.8rem' }}>Product Image</label>
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '1/1',
                                            borderRadius: '20px',
                                            overflow: 'hidden',
                                            background: '#f8fafc',
                                            border: '2px dashed #cbd5e1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                            onClick={() => document.getElementById('file-upload').click()}
                                            onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                                        >
                                            {formData.image_url ? (
                                                <>
                                                    <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px', fontSize: '0.8rem', textAlign: 'center' }}>Click to Change</div>
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '3rem', marginBottom: '10px' }}>☁️</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>Upload Photo</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>or paste URL below</span>
                                                </>
                                            )}
                                            <input
                                                id="file-upload"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;

                                                    try {
                                                        // Simple Upload Logic
                                                        const fileExt = file.name.split('.').pop();
                                                        const fileName = `${Math.random()}.${fileExt}`;
                                                        const filePath = `${fileName}`;

                                                        let { error: uploadError } = await supabase.storage
                                                            .from('products')
                                                            .upload(filePath, file);

                                                        if (uploadError) throw uploadError;

                                                        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
                                                        setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
                                                    } catch (err) {
                                                        console.error('Upload failed:', err);
                                                        alert('Upload failed: ' + err.message);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <div style={{ height: '1px', background: '#e2e8f0', flex: 1 }}></div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>OR URL</span>
                                                <div style={{ height: '1px', background: '#e2e8f0', flex: 1 }}></div>
                                            </div>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="image_url"
                                                value={formData.image_url}
                                                onChange={handleInputChange}
                                                placeholder="https://..."
                                                style={{ fontSize: '0.8rem', padding: '0.6rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Side: Main Form Fields */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Product Name *</label>
                                            <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Fresh Milk 1L" style={{ fontSize: '1.2rem', padding: '0.8rem', fontWeight: '600' }} />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div className="form-group">
                                                <label className="form-label">Category *</label>
                                                <select className="form-control" name="category_id" value={formData.category_id} onChange={handleInputChange} required style={{ padding: '0.8rem' }}>
                                                    <option value="">Select Category...</option>
                                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Unit</label>
                                                <select className="form-control" name="unit_of_measure" value={formData.unit_of_measure} onChange={handleInputChange} style={{ padding: '0.8rem' }}>
                                                    <option value="piece">Piece</option>
                                                    <option value="kg">Kg</option>
                                                    <option value="liter">Liter</option>
                                                    <option value="pack">Pack</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <textarea className="form-control" name="description" value={formData.description} onChange={handleInputChange} rows="3" placeholder="Brief details regarding the product specifications..." style={{ resize: 'none' }} />
                                        </div>

                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label" style={{ color: '#38bdf8' }}>Retail Price (Rs.)</label>
                                                <input type="number" className="form-control" name="retail_price" value={formData.retail_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', border: 'none', background: 'transparent', padding: '0' }} />
                                            </div>
                                            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label">Wholesale (Rs.)</label>
                                                <input type="number" className="form-control" name="wholesale_price" value={formData.wholesale_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" style={{ fontSize: '1.1rem', fontWeight: '600', border: 'none', background: 'transparent', padding: '0', color: '#94a3b8' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer / Advanced */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#475569', padding: '0.5rem', borderRadius: '8px', userSelect: 'none' }}>
                                            <input type="checkbox" name="is_perishable" checked={formData.is_perishable} onChange={handleInputChange} style={{ marginRight: '0.6rem', width: '18px', height: '18px', accentColor: '#f59e0b' }} />
                                            Is this item Perishable?
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button type="button" className="btn-cancel" style={{ padding: '0.8rem 1.5rem' }} onClick={handleCloseModal}>Cancel</button>
                                        <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
                                            {formData.id ? 'Save Changes' : 'Create Product'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </div >
    );
};

export default Items;
