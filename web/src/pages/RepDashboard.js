import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const RepDashboard = () => {
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPendingRequests(true); // silent refresh
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const fetchPendingRequests = async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);

        try {
            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // Get user ID from users table
            const { data: userRecord, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .single();

            if (userError) throw userError;

            const userId = userRecord?.id;
            setCurrentUserId(userId);

            // Step 1: Find all routes where this rep is assigned
            const { data: myRoutes, error: routesError } = await supabase
                .from('routes')
                .select('id')
                .eq('rep_id', userId);

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const myRouteIds = myRoutes?.map(r => r.id) || [];

            // Step 2: Find all shops assigned to this rep (either directly or through routes)
            let shopsQuery = supabase
                .from('shops')
                .select('id');

            // Build the query to find shops where:
            // - rep_id matches current user (direct assignment)
            // - OR route_id is in the rep's assigned routes
            if (myRouteIds.length > 0) {
                // Rep has routes OR direct shop assignments
                shopsQuery = shopsQuery.or(`rep_id.eq.${userId},route_id.in.(${myRouteIds.join(',')})`);
            } else {
                // Rep only has direct shop assignments, no routes
                shopsQuery = shopsQuery.eq('rep_id', userId);
            }

            const { data: myShops, error: shopsError } = await shopsQuery;

            if (shopsError) throw shopsError;

            if (!myShops || myShops.length === 0) {
                // No shops assigned to this rep
                setPendingItems([]);
                setLastUpdated(new Date());
                return;
            }

            const myShopIds = myShops.map(s => s.id);

            // Step 3: Fetch pending requests ONLY from the rep's assigned shops
            const { data: requestsData, error: reqError } = await supabase
                .from('requests')
                .select('id, status, shop_id')
                .eq('status', 'pending')
                .in('shop_id', myShopIds);

            if (reqError) throw reqError;

            if (!requestsData || requestsData.length === 0) {
                setPendingItems([]);
                setLastUpdated(new Date());
                return;
            }

            // Fetch request items for these requests
            const requestIds = requestsData.map(r => r.id);
            const { data: itemsData, error: itemsError } = await supabase
                .from('request_items')
                .select('id, request_id, qty, delivered_qty, item_id')
                .in('request_id', requestIds);

            if (itemsError) throw itemsError;

            // Get unique item IDs
            const itemIds = Array.from(new Set(itemsData?.map(row => row.item_id)));

            // Fetch item details
            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select('id, name')
                .in('id', itemIds);

            if (productsError) throw productsError;

            // Fetch rep's stock from stock_transactions
            const { data: repTransactions, error: stockError } = await supabase
                .from('stock_transactions')
                .select('item_id, qty, type')
                .eq('rep_id', userId)
                .in('item_id', itemIds);

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            // Create maps
            const itemsMap = new Map();
            const repStockMap = new Map();

            productsData?.forEach(p => itemsMap.set(p.id, p.name));

            // Calculate rep's available stock per item
            repTransactions?.forEach(trans => {
                const currentStock = repStockMap.get(trans.item_id) || 0;
                if (trans.type === 'OUT') {
                    repStockMap.set(trans.item_id, currentStock + trans.qty);
                }
            });

            // Aggregate pending items
            const itemsAggregationMap = new Map();

            itemsData?.forEach(row => {
                const pending = row.qty - (row.delivered_qty || 0);
                if (pending <= 0) return;

                const itemId = row.item_id;
                if (!itemId) return;

                const itemName = itemsMap.get(itemId) || 'Unknown Item';
                const currentStock = repStockMap.get(itemId) || 0;

                if (itemsAggregationMap.has(itemId)) {
                    const existing = itemsAggregationMap.get(itemId);
                    existing.totalPendingQty += pending;
                } else {
                    itemsAggregationMap.set(itemId, {
                        itemId: itemId,
                        itemName: itemName,
                        totalPendingQty: pending,
                        availableStock: currentStock
                    });
                }
            });

            setPendingItems(Array.from(itemsAggregationMap.values()));
            setLastUpdated(new Date());

        } catch (err) {
            console.error('Error fetching pending requests:', err);
            if (!silent) {
                setError(err.message || 'Failed to load data');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rep Dashboard</h1>
                    {lastUpdated && (
                        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchPendingRequests()}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>↻</span>
                        Refresh
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⎋</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && <div className="alert error">{error}</div>}

            {/* Navigation Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                <div
                    className="card overview-card"
                    onClick={() => window.location.href = '/rep/shops'}
                    style={{
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                        color: 'white',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏪</div>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Shop Requests</h3>
                    <div className="card-value" style={{ color: 'white' }}>View & Manage</div>
                </div>

                <div
                    className="card overview-card"
                    onClick={() => window.location.href = '/rep/stock'}
                    style={{
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                        color: 'white',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>My Stock</h3>
                    <div className="card-value" style={{ color: 'white' }}>Inventory</div>
                </div>
            </div>

            {/* Pending Items Summary */}
            <div className="table-container">
                <h2 className="section-title">Pending Items Summary</h2>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : pendingItems.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                        <h3>No Pending Items</h3>
                        <p>All shop requests have been fulfilled</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th style={{ textAlign: 'center' }}>Total Pending Qty</th>
                                <th style={{ textAlign: 'center' }}>My Available Stock</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingItems.map(item => {
                                const hasEnough = item.availableStock >= item.totalPendingQty;
                                const statusColor = hasEnough ? '#4CAF50' : '#FF9800';
                                const statusText = hasEnough ? 'Stock Available' : 'Need More Stock';

                                return (
                                    <tr key={item.itemId}>
                                        <td>
                                            <div style={{ fontWeight: '600', fontSize: '1rem', color: '#1A1A2E' }}>
                                                {item.itemName}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#FEE2E2',
                                                border: '1px solid #FECACA',
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                color: '#DC2626'
                                            }}>
                                                {item.totalPendingQty}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: hasEnough ? '#D1FAE5' : '#FEF3C7',
                                                border: `1px solid ${hasEnough ? '#A7F3D0' : '#FDE68A'}`,
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                color: hasEnough ? '#065F46' : '#92400E'
                                            }}>
                                                {item.availableStock}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                backgroundColor: `${statusColor}15`,
                                                border: `1px solid ${statusColor}40`,
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                color: statusColor,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {hasEnough ? '✓' : '⚠'} {statusText}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RepDashboard;
