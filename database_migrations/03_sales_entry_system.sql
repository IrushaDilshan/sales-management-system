-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Phase 2: Sales Entry System (FULL UUID FIX)
-- Migration: Customers, Sales, and Sales Items
-- Created: December 30, 2025
-- ==================================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'individual', -- 'individual', 'retailer', 'government', 'institution'
    contact_person VARCHAR(200),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    credit_limit DECIMAL(10,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0, -- Payment terms in days
    outstanding_balance DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sales table (using UUID for foreign keys)
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    outlet_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(200), -- Store name even if customer deleted
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'card', 'credit', 'bank_transfer'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'paid', 'pending', 'partial', 'overdue'
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_due DECIMAL(10,2) DEFAULT 0,
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create sale_items table (using UUID for items reference)
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES items(id) ON DELETE SET NULL, -- Changed to UUID
    product_name VARCHAR(200) NOT NULL, -- Store name even if product deleted
    sku VARCHAR(50),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    batch_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create payments table (track payments for credit sales)
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_outlet ON sales(outlet_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 6. Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    invoice_num TEXT;
BEGIN
    -- Get the next number from sequence or count
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM sales
    WHERE invoice_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-%';
    
    -- Format: INV-YYYYMM-0001
    invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sales_invoice_number ON sales;
CREATE TRIGGER set_sales_invoice_number
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION set_invoice_number();

-- 9. Create function to update customer outstanding balance
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE customers
        SET outstanding_balance = (
            SELECT COALESCE(SUM(amount_due), 0)
            FROM sales
            WHERE customer_id = NEW.customer_id
            AND payment_status != 'paid'
        )
        WHERE id = NEW.customer_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE customers
        SET outstanding_balance = (
            SELECT COALESCE(SUM(amount_due), 0)
            FROM sales
            WHERE customer_id = OLD.customer_id
            AND payment_status != 'paid'
        )
        WHERE id = OLD.customer_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_balance_on_sale ON sales;
CREATE TRIGGER update_customer_balance_on_sale
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance();

-- 10. Create function to reduce stock on sale
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    sale_outlet_id UUID;
BEGIN
    -- Get the outlet_id from the sale
    SELECT outlet_id INTO sale_outlet_id
    FROM sales
    WHERE id = NEW.sale_id;
    
    -- Reduce stock for this product at this outlet
    UPDATE stock
    SET quantity = quantity - NEW.quantity
    WHERE item_id = NEW.product_id
    AND (outlet_id = sale_outlet_id OR (outlet_id IS NULL AND sale_outlet_id IS NULL));
    
    -- Record stock movement
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        quantity,
        movement_type,
        reference_number,
        notes
    ) VALUES (
        NEW.product_id,
        sale_outlet_id,
        NEW.quantity,
        'sale',
        (SELECT invoice_number FROM sales WHERE id = NEW.sale_id),
        'Stock sold'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reduce_stock_after_sale ON sale_items;
CREATE TRIGGER reduce_stock_after_sale
    AFTER INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION reduce_stock_on_sale();

-- 11. Add comments for documentation
COMMENT ON TABLE customers IS 'Customer database - farmers, retailers, government institutions';
COMMENT ON COLUMN customers.customer_type IS 'Type: individual, retailer, government, institution';
COMMENT ON COLUMN customers.credit_limit IS 'Maximum credit amount allowed';
COMMENT ON COLUMN customers.credit_days IS 'Payment terms days (e.g., Net 30)';
COMMENT ON COLUMN customers.outstanding_balance IS 'Total unpaid amount across all sales';

COMMENT ON TABLE sales IS 'Sales transactions from all outlets';
COMMENT ON COLUMN sales.invoice_number IS 'Auto-generated: INV-YYYYMM-0001';
COMMENT ON COLUMN sales.payment_method IS 'Method: cash, card, credit, bank_transfer';
COMMENT ON COLUMN sales.payment_status IS 'Status: paid, pending, partial, overdue';

COMMENT ON TABLE sale_items IS 'Line items for each sale transaction';
COMMENT ON TABLE payments IS 'Payment collections for credit sales';

-- 12. Create views for reporting
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
    s.id,
    s.invoice_number,
    s.sale_date,
    sh.name as outlet_name,
    c.name as customer_name,
    c.customer_type,
    s.total_amount,
    s.payment_method,
    s.payment_status,
    s.amount_paid,
    s.amount_due,
    COUNT(si.id) as item_count
FROM sales s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.id, sh.name, c.name, c.customer_type;

COMMENT ON VIEW sales_summary IS 'Summary view of all sales with customer and outlet info';

-- 13. Create view for outstanding payments
CREATE OR REPLACE VIEW outstanding_sales AS
SELECT 
    s.id,
    s.invoice_number,
    s.sale_date,
    s.due_date,
    c.id as customer_id,
    c.name as customer_name,
    c.customer_type,
    c.phone,
    s.total_amount,
    s.amount_paid,
    s.amount_due,
    s.payment_status,
    (CURRENT_DATE - s.due_date::date) as days_overdue,
    CASE
        WHEN s.due_date < CURRENT_DATE THEN 'overdue'
        WHEN s.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 'due_soon'
        ELSE 'current'
    END as aging_status
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE s.payment_status IN ('pending', 'partial')
ORDER BY s.due_date;

COMMENT ON VIEW outstanding_sales IS 'Sales with outstanding payments and aging info';

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('customers', 'sales', 'sale_items', 'payments')
ORDER BY table_name;

-- Check if views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('sales_summary', 'outstanding_sales')
ORDER BY table_name;

-- Test invoice number generation
SELECT generate_invoice_number() as sample_invoice_number;

-- Verify all data types match correctly
SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name
FROM information_schema.columns c
WHERE c.table_name IN ('sales', 'sale_items', 'items', 'shops', 'users', 'stock')
AND c.column_name IN ('id', 'outlet_id', 'product_id', 'item_id', 'created_by')
ORDER BY c.table_name, c.column_name;

-- ==================================================
-- SUCCESS!
-- Your database now supports:
-- ✅ Customer management
-- ✅ Sales transactions
-- ✅ Sale line items
-- ✅ Payment tracking
-- ✅ Auto invoice generation
-- ✅ Auto stock reduction on sale
-- ✅ Customer balance tracking
-- ✅ Outstanding sales tracking
-- ✅ Full UUID compatibility with existing database
--
-- Next step: Create Customers and Sales pages in the web app
-- ==================================================
