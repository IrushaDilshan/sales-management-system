import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';

const Shops = () => {
    const [shops, setShops] = useState([]);
    const [reps, setReps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', rep_id: '' });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Shops
            const { data: shopsData, error: shopsError } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            if (shopsError) throw shopsError;

            // Fetch Reps
            const { data: repsData, error: repsError } = await supabase
                .from('users')
                .select('id, name')
                .eq('role', 'rep'); // Strict check for role 'rep'

            if (repsError) throw repsError;

            setReps(repsData || []);

            // Manual Join
            const formattedShops = (shopsData || []).map(shop => {
                const assignedRep = repsData.find(r => r.id === shop.rep_id);
                return {
                    ...shop,
                    rep: assignedRep || null
                };
            });

            setShops(formattedShops);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Removed separate fetchReps and fetchShops calls in favor of single fetchData


    const handleOpenModal = (shop = null) => {
        if (shop) {
            setFormData({
                id: shop.id,
                name: shop.name || '',
                rep_id: shop.rep_id || ''
            });
        } else {
            setFormData({ id: null, name: '', rep_id: '' });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', rep_id: '' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Schema: shops(id, name, rep_id)
            const updates = {
                name: formData.name,
                rep_id: formData.rep_id || null
            };

            let error;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('shops')
                    .update(updates)
                    .eq('id', formData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('shops')
                    .insert([updates]);
                error = insertError;
            }

            if (error) throw error;

            fetchData();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this shop?')) {
            try {
                const { error } = await supabase
                    .from('shops')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchData();
            } catch (err) {
                console.error('Error deleting shop:', err);
                alert('Failed to delete shop');
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Shop Management</h1>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Shop
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    {shops.length === 0 ? (
                        <div className="empty-state">
                            <h3>No shops found</h3>
                            <p>Click "Add Shop" to create your first shop.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Shop Name</th>
                                    <th>Assigned Rep</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shops.map((shop) => (
                                    <tr key={shop.id || Math.random()}>
                                        <td>{shop.name}</td>
                                        <td>{shop.rep ? shop.rep.name : <span style={{ color: '#9ca3af' }}>Unassigned</span>}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="action-btn btn-edit" onClick={() => handleOpenModal(shop)}>
                                                Edit
                                            </button>
                                            <button className="action-btn btn-delete" onClick={() => handleDelete(shop.id)}>
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
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit Shop' : 'Add New Shop'}
                        </h2>

                        {error && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Shop Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Super Mart"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign Representative</label>
                                <select
                                    className="form-select"
                                    name="rep_id"
                                    value={formData.rep_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">-- Select Representative --</option>
                                    {reps.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create Shop'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shops;
