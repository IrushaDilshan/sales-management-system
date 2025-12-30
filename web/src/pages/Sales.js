import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Sales = () => {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Sale form
    const [saleData, setSaleData] = useState({
        outlet_id: '',
        customer_id: '',
        payment_method: 'cash',
        discount: 0,
        tax: 0,
        notes: '',
        credit_days: 0
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Fetch products with stock info
            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (name),
                    stock (quantity, outlet_id)
                `)
                .order('name');

            if (productsError) throw productsError;

            // Fetch customers
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (customersError) throw customersError;

            // Fetch outlets
            const { data: outletsData, error: outletsError } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            if (outletsError) throw outletsError;

            setProducts(productsData || []);
            setCustomers(customersData || []);
            setOutlets(outletsData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Get available stock for a product at selected outlet
    const getAvailableStock = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product || !product.stock) return 0;

        if (saleData.outlet_id) {
            const outletStock = product.stock.find(s => s.outlet_id === saleData.outlet_id);
            return outletStock ? outletStock.quantity : 0;
        } else {
            // Sum all stock if no outlet selected
            return product.stock.reduce((sum, s) => sum + (s.quantity || 0), 0);
        }
    };

    // Add product to cart
    const addToCart = (product) => {
        const availableStock = getAvailableStock(product.id);

        if (availableStock <= 0) {
            setError(`${product.name} is out of stock`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        const existingItem = cart.find(item => item.product_id === product.id);

        if (existingItem) {
            if (existingItem.quantity >= availableStock) {
                setError(`Only ${availableStock} ${product.unit_of_measure || 'units'} available`);
                setTimeout(() => setError(null), 3000);
                return;
            }
            updateCartQuantity(product.id, existingItem.quantity + 1);
        } else {
            const newItem = {
                product_id: product.id,
                product_name: product.name,
                sku: product.sku,
                quantity: 1,
                unit_price: product.retail_price || 0,
                discount: 0,
                tax: 0,
                line_total: product.retail_price || 0
            };
            setCart([...cart, newItem]);
        }
    };

    // Update cart item quantity
    const updateCartQuantity = (productId, newQuantity) => {
        const availableStock = getAvailableStock(productId);

        if (newQuantity > availableStock) {
            setError(`Only ${availableStock} units available`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const lineTotal = (newQuantity * item.unit_price) - item.discount + item.tax;
                return { ...item, quantity: newQuantity, line_total: lineTotal };
            }
            return item;
        }));
    };

    // Update cart item price
    const updateCartPrice = (productId, newPrice) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const lineTotal = (item.quantity * newPrice) - item.discount + item.tax;
                return { ...item, unit_price: newPrice, line_total: lineTotal };
            }
            return item;
        }));
    };

    // Remove from cart
    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    // Calculate totals
    const calculateTotals = () => {
        const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
        const discount = parseFloat(saleData.discount) || 0;
        const tax = parseFloat(saleData.tax) || 0;
        const total = subtotal - discount + tax;

        return { subtotal, discount, tax, total };
    };

    // Handle sale submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            setError('Please add at least one item to the cart');
            return;
        }

        if (!saleData.outlet_id && outlets.length > 0) {
            setError('Please select an outlet');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const totals = calculateTotals();
            const isDue = saleData.payment_method === 'credit';

            // Calculate due date for credit sales
            let dueDate = null;
            if (isDue) {
                const days = parseInt(saleData.credit_days) || 30;
                dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + days);
            }

            // Get selected customer name
            let customerName = null;
            if (saleData.customer_id) {
                const customer = customers.find(c => c.id == saleData.customer_id);
                customerName = customer ? customer.name : null;
            }

            // Create sale
            const { data: saleRecord, error: saleError } = await supabase
                .from('sales')
                .insert([{
                    outlet_id: saleData.outlet_id || null,
                    customer_id: saleData.customer_id || null,
                    customer_name: customerName,
                    subtotal: totals.subtotal,
                    discount: totals.discount,
                    tax: totals.tax,
                    total_amount: totals.total,
                    payment_method: saleData.payment_method,
                    payment_status: isDue ? 'pending' : 'paid',
                    amount_paid: isDue ? 0 : totals.total,
                    amount_due: isDue ? totals.total : 0,
                    due_date: dueDate,
                    notes: saleData.notes || null,
                    invoice_number: '' // Will be auto-generated by trigger
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            // Create sale items
            const saleItems = cart.map(item => ({
                sale_id: saleRecord.id,
                product_id: item.product_id,
                product_name: item.product_name,
                sku: item.sku,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                tax: item.tax,
                line_total: item.line_total
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            // Success!
            setSuccess(`Sale created successfully! Invoice: ${saleRecord.invoice_number}`);

            // Reset form
            setCart([]);
            setSaleData({
                outlet_id: saleData.outlet_id, // Keep outlet selected
                customer_id: '',
                payment_method: 'cash',
                discount: 0,
                tax: 0,
                notes: '',
                credit_days: 0
            });

            // Refresh products to update stock
            fetchInitialData();

            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            console.error('Error creating sale:', err);
            setError(err.message || 'Failed to create sale');
        } finally {
            setSaving(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales Entry</h1>
                    <p className="page-subtitle">Record daily sales transactions</p>
                </div>
            </div>

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

            {success && (
                <div style={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                }}>
                    {success}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Left: Product Selection & Cart */}
                    <div>
                        {/* Sale Header */}
                        <div style={{
                            backgroundColor: 'white',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Outlet / Location *</label>
                                    <select
                                        className="form-input"
                                        value={saleData.outlet_id}
                                        onChange={(e) => setSaleData({ ...saleData, outlet_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select outlet</option>
                                        {outlets.map(outlet => (
                                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Customer (Optional)</label>
                                    <select
                                        className="form-input"
                                        value={saleData.customer_id}
                                        onChange={(e) => setSaleData({ ...saleData, customer_id: e.target.value })}
                                    >
                                        <option value="">Walk-in Customer</option>
                                        {customers.map(customer => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.name} ({customer.customer_type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div style={{
                            backgroundColor: 'white',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Select Products</h3>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '1rem',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {products.map(product => {
                                    const stock = getAvailableStock(product.id);
                                    const inCart = cart.find(item => item.product_id === product.id);

                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                cursor: stock > 0 ? 'pointer' : 'not-allowed',
                                                opacity: stock > 0 ? 1 : 0.5,
                                                backgroundColor: inCart ? '#dbeafe' : 'white',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                {product.name}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                                Rs. {product.retail_price?.toFixed(2) || '0.00'}
                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: stock > 0 ? '#059669' : '#dc2626',
                                                marginTop: '0.5rem'
                                            }}>
                                                Stock: {stock} {product.unit_of_measure || 'units'}
                                            </div>
                                            {inCart && (
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: '#3b82f6',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    In cart: {inCart.quantity}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cart */}
                        <div style={{
                            backgroundColor: 'white',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
                                Shopping Cart ({cart.length} items)
                            </h3>

                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                                    Click on products to add to cart
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th style={{ width: '100px' }}>Qty</th>
                                            <th style={{ width: '120px' }}>Price</th>
                                            <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
                                            <th style={{ width: '60px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.map(item => (
                                            <tr key={item.product_id}>
                                                <td>
                                                    <strong>{item.product_name}</strong>
                                                    {item.sku && (
                                                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                                            {item.sku}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={item.quantity}
                                                        onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value))}
                                                        min="1"
                                                        style={{ width: '80px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateCartPrice(item.product_id, parseFloat(e.target.value))}
                                                        min="0"
                                                        step="0.01"
                                                        style={{ width: '100px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <strong>Rs. {item.line_total.toFixed(2)}</strong>
                                                </td>
                                                <td>
                                                    <button
                                                        className="action-btn btn-delete"
                                                        onClick={() => removeFromCart(item.product_id)}
                                                        style={{ padding: '0.25rem 0.5rem' }}
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Right: Payment & Summary */}
                    <div>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            position: 'sticky',
                            top: '1rem'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Payment Details</h3>

                            <form onSubmit={handleSubmit}>
                                {/* Payment Method */}
                                <div className="form-group">
                                    <label className="form-label">Payment Method *</label>
                                    <select
                                        className="form-input"
                                        value={saleData.payment_method}
                                        onChange={(e) => setSaleData({ ...saleData, payment_method: e.target.value })}
                                        required
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="credit">Credit (Pay Later)</option>
                                    </select>
                                </div>

                                {/* Credit Days (only for credit sales) */}
                                {saleData.payment_method === 'credit' && (
                                    <div className="form-group">
                                        <label className="form-label">Payment Due In (Days)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={saleData.credit_days}
                                            onChange={(e) => setSaleData({ ...saleData, credit_days: e.target.value })}
                                            min="1"
                                            placeholder="30"
                                        />
                                        <small style={{ fontSize: '0.875rem', color: '#666' }}>
                                            Default: 30 days
                                        </small>
                                    </div>
                                )}

                                {/* Discount */}
                                <div className="form-group">
                                    <label className="form-label">Discount (Rs.)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={saleData.discount}
                                        onChange={(e) => setSaleData({ ...saleData, discount: e.target.value })}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {/* Tax */}
                                <div className="form-group">
                                    <label className="form-label">Tax (Rs.)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={saleData.tax}
                                        onChange={(e) => setSaleData({ ...saleData, tax: e.target.value })}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {/* Notes */}
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-input"
                                        value={saleData.notes}
                                        onChange={(e) => setSaleData({ ...saleData, notes: e.target.value })}
                                        rows="2"
                                        placeholder="Additional notes..."
                                    />
                                </div>

                                {/* Totals Summary */}
                                <div style={{
                                    borderTop: '2px solid #e5e7eb',
                                    paddingTop: '1rem',
                                    marginTop: '1rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <span>Subtotal:</span>
                                        <span>Rs. {totals.subtotal.toFixed(2)}</span>
                                    </div>

                                    {totals.discount > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '0.5rem',
                                            color: '#059669'
                                        }}>
                                            <span>Discount:</span>
                                            <span>- Rs. {totals.discount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totals.tax > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <span>Tax:</span>
                                            <span>+ Rs. {totals.tax.toFixed(2)}</span>
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
                                        <span>Rs. {totals.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={saving || cart.length === 0}
                                    style={{
                                        width: '100%',
                                        marginTop: '1.5rem',
                                        padding: '1rem',
                                        fontSize: '1.1rem'
                                    }}
                                >
                                    {saving ? 'Processing...' : `Complete Sale (Rs. ${totals.total.toFixed(2)})`}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
