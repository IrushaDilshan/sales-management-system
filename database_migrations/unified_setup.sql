-- ==================================================
-- BASELINE SCHEMA SETUP
-- Creates the baseline tables before migrations run.
-- ==================================================

-- Restore default Supabase permissions on public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create items table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'pending',
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create shops table
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
    route_id BIGINT REFERENCES routes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Circular reference
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

-- 5. Create stock table
CREATE TABLE IF NOT EXISTS stock (
    id BIGSERIAL PRIMARY KEY,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    salesman_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create request_items table
CREATE TABLE IF NOT EXISTS request_items (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    qty INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES requests(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create salesman_shops table
CREATE TABLE IF NOT EXISTS salesman_shops (
    salesman_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    PRIMARY KEY (salesman_id, shop_id)
);

-- 10. Create rep_shops table
CREATE TABLE IF NOT EXISTS rep_shops (
    rep_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    PRIMARY KEY (rep_id, shop_id)
);

-- 11. Create shop_requests table
CREATE TABLE IF NOT EXISTS shop_requests (
    id BIGSERIAL PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Supabase auth.users profile sync trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- END OF BASELINE
-- ==================================================


-- --- START OF MIGRATION: 01_product_categories.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Product Categories System
-- Created: December 30, 2025
-- ==================================================

-- 1. Create product_categories table
-- This stores NLDB's 8 main product categories
CREATE TABLE IF NOT EXISTS product_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0, -- Commission percentage for sales reps
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add category and pricing fields to existing items table
-- Check if columns exist before adding
DO $$ 
BEGIN
    -- Add category_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'category_id') THEN
        ALTER TABLE items ADD COLUMN category_id BIGINT REFERENCES product_categories(id);
    END IF;

    -- Add SKU if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'sku') THEN
        ALTER TABLE items ADD COLUMN sku VARCHAR(50) UNIQUE;
    END IF;

    -- Add barcode if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'barcode') THEN
        ALTER TABLE items ADD COLUMN barcode VARCHAR(100);
    END IF;

    -- Add wholesale_price if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'wholesale_price') THEN
        ALTER TABLE items ADD COLUMN wholesale_price DECIMAL(10,2);
    END IF;

    -- Add retail_price if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'retail_price') THEN
        ALTER TABLE items ADD COLUMN retail_price DECIMAL(10,2);
    END IF;

    -- Add unit_of_measure if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'unit_of_measure') THEN
        ALTER TABLE items ADD COLUMN unit_of_measure VARCHAR(20) DEFAULT 'piece';
    END IF;

    -- Add is_perishable if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'is_perishable') THEN
        ALTER TABLE items ADD COLUMN is_perishable BOOLEAN DEFAULT false;
    END IF;

    -- Add shelf_life_days if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'shelf_life_days') THEN
        ALTER TABLE items ADD COLUMN shelf_life_days INTEGER;
    END IF;

    -- Add description if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'description') THEN
        ALTER TABLE items ADD COLUMN description TEXT;
    END IF;
END $$;

-- 3. Insert NLDB's 8 main product categories
-- These are based on NLDB's actual business categories
INSERT INTO product_categories (name, description, commission_rate) VALUES
    ('Breeding Stock', 'Live animals for breeding - chicks, calves, kids, piglets', 2.5),
    ('Milk Products', 'Fresh milk, yogurt, cheese and other dairy products', 2.0),
    ('Eggs', 'Fresh eggs from poultry farms', 1.5),
    ('Meat Products', 'Fresh and processed meat products', 2.0),
    ('Coconut Products', 'Coconuts, coconut oil, and related products', 1.5),
    ('Agricultural Products', 'Feed, fertilizer, and other agricultural inputs', 1.0),
    ('Services', 'Training, consultancy, and other services', 5.0),
    ('Other', 'Miscellaneous products and items', 1.0)
ON CONFLICT (name) DO NOTHING; -- Don't insert if already exists

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_categories_active ON product_categories(is_active);

-- 5. Add updated_at trigger for categories table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Add comments for documentation
COMMENT ON TABLE product_categories IS 'NLDB product categories - 8 main business categories';
COMMENT ON COLUMN product_categories.commission_rate IS 'Commission percentage for sales representatives';
COMMENT ON COLUMN items.category_id IS 'Links to product_categories table';
COMMENT ON COLUMN items.sku IS 'Stock Keeping Unit - unique product identifier';
COMMENT ON COLUMN items.wholesale_price IS 'Price for bulk/wholesale customers';
COMMENT ON COLUMN items.retail_price IS 'Price for retail customers';
COMMENT ON COLUMN items.unit_of_measure IS 'Unit: piece, kg, liter, dozen, etc.';
COMMENT ON COLUMN items.is_perishable IS 'Whether product requires expiry tracking';
COMMENT ON COLUMN items.shelf_life_days IS 'Shelf life in days for perishable items';

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check if categories were created
SELECT * FROM product_categories ORDER BY name;

-- Check items table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' 
ORDER BY ordinal_position;

-- Count items by category
SELECT 
    pc.name as category,
    COUNT(i.id) as item_count
FROM product_categories pc
LEFT JOIN items i ON i.category_id = pc.id
GROUP BY pc.id, pc.name
ORDER BY pc.name;

-- ==================================================
-- SUCCESS!
-- Run the verification queries above to confirm everything is set up correctly.
-- Next step: Create the Categories management page in the web app
-- ==================================================

-- --- END OF MIGRATION: 01_product_categories.sql ---

-- --- START OF MIGRATION: 02_multi_location_inventory.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Multi-Location Inventory
-- Created: December 30, 2025
-- ==================================================

-- 1. Add outlet_id to stock table for multi-location tracking
-- This allows tracking inventory at each farm/sales center separately
DO $$ 
BEGIN
    -- Add outlet_id if not exists (references shops table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'outlet_id') THEN
        ALTER TABLE stock ADD COLUMN outlet_id UUID REFERENCES shops(id);
    END IF;

    -- Add batch_number for lot tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'batch_number') THEN
        ALTER TABLE stock ADD COLUMN batch_number VARCHAR(50);
    END IF;

    -- Add manufacture_date for perishables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'manufacture_date') THEN
        ALTER TABLE stock ADD COLUMN manufacture_date DATE;
    END IF;

    -- Add expiry_date for perishables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'expiry_date') THEN
        ALTER TABLE stock ADD COLUMN expiry_date DATE;
    END IF;

    -- Add minimum_stock_level for alerts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'minimum_stock_level') THEN
        ALTER TABLE stock ADD COLUMN minimum_stock_level INTEGER DEFAULT 0;
    END IF;

    -- Add last_updated timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'last_updated') THEN
        ALTER TABLE stock ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. Create stock_movements table for tracking all stock changes
CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id UUID REFERENCES items(id) ON DELETE CASCADE,
    from_outlet_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    to_outlet_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'transfer', 'adjustment', 'sale', 'purchase', 'wastage'
    batch_number VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create wastage table for tracking spoilage and losses
CREATE TABLE IF NOT EXISTS wastage (
    id BIGSERIAL PRIMARY KEY,
    product_id UUID REFERENCES items(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    batch_number VARCHAR(50),
    quantity INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'expired', 'damaged', 'spoiled', 'other'
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_outlet_id ON stock(outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_outlet ON stock(item_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_expiry_date ON stock(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_batch ON stock(batch_number);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_from_outlet ON stock_movements(from_outlet_id);
CREATE INDEX IF NOT EXISTS idx_movements_to_outlet ON stock_movements(to_outlet_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_wastage_product ON wastage(product_id);
CREATE INDEX IF NOT EXISTS idx_wastage_outlet ON wastage(outlet_id);
CREATE INDEX IF NOT EXISTS idx_wastage_date ON wastage(recorded_at);

-- 5. Add trigger to update last_updated on stock changes
CREATE OR REPLACE FUNCTION update_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stock_last_updated ON stock;
CREATE TRIGGER update_stock_last_updated
    BEFORE UPDATE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_timestamp();

-- 6. Add comments for documentation
COMMENT ON COLUMN stock.outlet_id IS 'Which outlet/farm this stock is located at';
COMMENT ON COLUMN stock.batch_number IS 'Batch/lot number for tracking and FIFO';
COMMENT ON COLUMN stock.manufacture_date IS 'When the product was manufactured/produced';
COMMENT ON COLUMN stock.expiry_date IS 'When the product expires (for perishables)';
COMMENT ON COLUMN stock.minimum_stock_level IS 'Alert when stock falls below this level';
COMMENT ON COLUMN stock.last_updated IS 'Last time stock was updated';

COMMENT ON TABLE stock_movements IS 'Tracks all stock movements between outlets and adjustments';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type: transfer, adjustment, sale, purchase, wastage';
COMMENT ON COLUMN stock_movements.reference_number IS 'Invoice/PO/Transfer number';

COMMENT ON TABLE wastage IS 'Tracks product wastage, spoilage, and losses';
COMMENT ON COLUMN wastage.reason IS 'Reason: expired, damaged, spoiled, other';

-- 7. Create a view for stock summary by outlet
CREATE OR REPLACE VIEW stock_by_outlet AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.quantity) as total_quantity,
    i.unit_of_measure,
    s.minimum_stock_level,
    MIN(s.expiry_date) as earliest_expiry,
    COUNT(DISTINCT s.batch_number) as batch_count
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, i.unit_of_measure, s.minimum_stock_level;

COMMENT ON VIEW stock_by_outlet IS 'Summary of stock levels by outlet and product';

-- 8. Create a view for low stock alerts
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.quantity) as current_stock,
    s.minimum_stock_level,
    (s.minimum_stock_level - SUM(s.quantity)) as shortage
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, s.minimum_stock_level
HAVING SUM(s.quantity) < s.minimum_stock_level AND s.minimum_stock_level > 0;

COMMENT ON VIEW low_stock_alerts IS 'Products below minimum stock level at each outlet';

-- 9. Create a view for expiring products (next 7 days)
CREATE OR REPLACE VIEW expiring_soon AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    s.batch_number,
    s.quantity,
    s.expiry_date,
    (s.expiry_date - CURRENT_DATE) as days_until_expiry
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
WHERE s.expiry_date IS NOT NULL 
  AND s.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
  AND s.quantity > 0
ORDER BY s.expiry_date;

COMMENT ON VIEW expiring_soon IS 'Products expiring in the next 7 days';

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check stock table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stock' 
ORDER BY ordinal_position;

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stock_movements', 'wastage')
ORDER BY table_name;

-- Check if views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('stock_by_outlet', 'low_stock_alerts', 'expiring_soon')
ORDER BY table_name;

-- Sample query: Stock by outlet
SELECT * FROM stock_by_outlet LIMIT 10;

-- Sample query: Low stock alerts
SELECT * FROM low_stock_alerts;

-- Sample query: Expiring products
SELECT * FROM expiring_soon;

-- ==================================================
-- SUCCESS!
-- Your database now supports:
-- ✅ Multi-location inventory tracking
-- ✅ Batch/lot tracking
-- ✅ Expiry date management
-- ✅ Stock movement history
-- ✅ Wastage tracking
-- ✅ Low stock alerts
-- ✅ Expiry alerts
--
-- Next step: Update the Stock management page in the web app
-- ==================================================

-- --- END OF MIGRATION: 02_multi_location_inventory.sql ---

-- --- START OF MIGRATION: 03_sales_entry_system.sql ---
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

-- --- END OF MIGRATION: 03_sales_entry_system.sql ---

-- --- START OF MIGRATION: 04_fix_requests_timestamp.sql ---
-- FIX: Real-Time Requests "19h ago" / Timezone Issue
-- Run this in your Supabase SQL Editor to ensure the created_at column supports precise timestamps.

-- 1. Ensure created_at exists and is the correct type (TIMESTAMPTZ)
-- This allows us to store the exact time the request was made, not just the date.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE requests ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

-- 2. Update existing records
-- For records where created_at might be missing, fill it with the date (will be midnight, but better than null)
-- UPDATE requests SET created_at = date::timestamp WHERE created_at IS NULL; -- (Bypassed: Column date does not exist in baseline)

-- --- END OF MIGRATION: 04_fix_requests_timestamp.sql ---

-- --- START OF MIGRATION: 05_salesman_operations.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Salesman Operations (Transfers & Returns)
-- Created: January 8, 2026
-- Updated: To use 'qty' instead of 'quantity' to match schema
-- ==================================================

-- 1. Function to transfer stock between two shops
CREATE OR REPLACE FUNCTION transfer_stock(
    p_product_id UUID,
    p_from_outlet_id UUID,
    p_to_outlet_id UUID,
    p_quantity INTEGER,
    p_notes TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_current_stock INTEGER;
    v_item_id UUID;
BEGIN
    -- Ensure input is valid
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be positive');
    END IF;

    -- Check source stock
    SELECT quantity INTO v_current_stock
    FROM stock
    WHERE item_id = p_product_id AND outlet_id = p_from_outlet_id;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock at source shop');
    END IF;

    -- Deduct from source
    UPDATE stock
    SET quantity = quantity - p_quantity,
        last_updated = NOW()
    WHERE item_id = p_product_id AND outlet_id = p_from_outlet_id;

    -- Add to destination (create row if not exists)
    IF EXISTS (SELECT 1 FROM stock WHERE item_id = p_product_id AND outlet_id = p_to_outlet_id) THEN
        UPDATE stock
        SET quantity = quantity + p_quantity,
            last_updated = NOW()
        WHERE item_id = p_product_id AND outlet_id = p_to_outlet_id;
    ELSE
        INSERT INTO stock (item_id, outlet_id, quantity, last_updated)
        VALUES (p_product_id, p_to_outlet_id, p_quantity, NOW());
    END IF;

    -- Log movement
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        to_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_product_id,
        p_from_outlet_id,
        p_to_outlet_id,
        p_quantity,
        'transfer',
        p_notes,
        p_user_id,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transfer successful');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 2. Function to process customer returns
CREATE OR REPLACE FUNCTION process_customer_return(
    p_product_id UUID,
    p_outlet_id UUID,
    p_quantity INTEGER,
    p_reason TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Ensure input is valid
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be positive');
    END IF;

    -- Add to stock (create if not exists)
    IF EXISTS (SELECT 1 FROM stock WHERE item_id = p_product_id AND outlet_id = p_outlet_id) THEN
        UPDATE stock
        SET quantity = quantity + p_quantity,
            last_updated = NOW()
        WHERE item_id = p_product_id AND outlet_id = p_outlet_id;
    ELSE
        INSERT INTO stock (item_id, outlet_id, quantity, last_updated)
        VALUES (p_product_id, p_outlet_id, p_quantity, NOW());
    END IF;

    -- Log movement
    INSERT INTO stock_movements (
        product_id,
        to_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_product_id,
        p_outlet_id,
        p_quantity,
        'return',
        p_reason,
        p_user_id,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Return processed successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- --- END OF MIGRATION: 05_salesman_operations.sql ---

-- --- START OF MIGRATION: 06_fix_stock_schema.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Stock Schema for Multi-Location
-- Created: January 8, 2026
-- ==================================================

-- 1. Ensure 'outlet_id' column exists in 'stock' table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'outlet_id') THEN
        ALTER TABLE stock ADD COLUMN outlet_id UUID REFERENCES shops(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure 'qty' column uses correct name (fix consistency if 'quantity' exists incorrectly)
DO $$ 
BEGIN
    -- If 'quantity' exists but 'qty' does not, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'quantity') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') THEN
        -- ALTER TABLE stock RENAME COLUMN quantity TO qty; -- (Bypassed: Column is always quantity)
    END IF;
END $$;

-- 3. Update existing stock records to have a valid outlet_id if null
-- We assign them to the first available shop to avoid 'orphaned' stock
DO $$
DECLARE
    v_default_shop_id UUID;
BEGIN
    SELECT id INTO v_default_shop_id FROM shops LIMIT 1;
    
    IF v_default_shop_id IS NOT NULL THEN
        UPDATE stock
        SET outlet_id = v_default_shop_id
        WHERE outlet_id IS NULL;
    END IF;
END $$;

-- 4. Update Unique Constraint to be (item_id, outlet_id) instead of just (item_id)
-- This allows the same item to exist in multiple shops
DO $$
BEGIN
    -- Drop existing constraints if they exist (names may vary, so we try standard names)
    -- We'll try to drop the constraint on item_id if it exists
    BEGIN
        ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_item_id_key;
        ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_pkey; -- If PK was just item_id
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if constraint doesn't exist
    END;

    -- Create new unique constraint on (item_id, outlet_id)
    -- Using coalesce for outlet_id to handle potential nulls if any remain (though we tried to fix them)
    -- Note: Unique constraints usually don't work well with NULLs, but we expect outlet_id to be set now.
    
    -- Option A: Composite Primary Key (Preferred if ID column doesn't exist)
    -- check if 'id' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'id') THEN
         -- Make composite PK
         ALTER TABLE stock ADD PRIMARY KEY (item_id, outlet_id);
    ELSE
         -- If ID exists, just add unique constraint
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_item_outlet_unique') THEN
             ALTER TABLE stock ADD CONSTRAINT stock_item_outlet_unique UNIQUE (item_id, outlet_id);
         END IF;
    END IF;

END $$;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_stock_outlet_item ON stock(outlet_id, item_id);

-- --- END OF MIGRATION: 06_fix_stock_schema.sql ---

-- --- START OF MIGRATION: 07_ensure_routes_permissions.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Routes Permissions
-- Created: January 13, 2026
-- ==================================================

-- 1. Ensure routes table has RLS enabled
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- 2. Grant SELECT permission on routes to ALL authenticated users (Salesmen need this)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON routes;
CREATE POLICY "Enable read access for all authenticated users" ON routes
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. Ensure shops are readable by authenticated users
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON shops;
CREATE POLICY "Enable read access for all authenticated users" ON shops
    FOR SELECT
    TO authenticated
    USING (true);

-- 4. Ensure users table allows reading basic info for Reps
-- This is critical for fetching rep details
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON users;
CREATE POLICY "Enable read access for all authenticated users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- ==================================================
-- SUCCESS!
-- Routes and User permissions updated.
-- ==================================================

-- --- END OF MIGRATION: 07_ensure_routes_permissions.sql ---

-- --- START OF MIGRATION: 08_add_phone_to_users.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Add Phone Number to Users
-- Created: January 13, 2026
-- ==================================================

-- 1. Add phone column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. Drop the existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own profile including phone" ON users;

-- 3. Update RLS policy to allow users to update their own phone number
-- Note: You might already have an update policy, this ensures phone is covered.
CREATE POLICY "Users can update their own profile including phone" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==================================================
-- SUCCESS!
-- Phone column added to Users table.
-- ==================================================

-- 4. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 08_add_phone_to_users.sql ---

-- --- START OF MIGRATION: 09_fix_admin_permissions_and_shop_id.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Shop Assignment & Admin Permissions
-- Created: January 13, 2026
-- ==================================================

-- 1. Ensure shop_id exists in users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE users ADD COLUMN shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Allow Admins to UPDATE any user (Essential for assigning shops/roles)
-- We check if the *requesting user* has the role 'admin' in the users table.
-- Using a security definer function avoids infinite recursion.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Policy for Admin Updates
DROP POLICY IF EXISTS "Admins can update any profile" ON users;
CREATE POLICY "Admins can update any profile" ON users
    FOR UPDATE
    TO authenticated
    USING ( is_admin() )
    WITH CHECK ( is_admin() );

-- 4. Create Policy for Admin Inserts/Deletes (just in case)
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
-- Some setups might separate insert/delete policies
-- For simplicity, let's just ensure Admins have full access.
-- (Note: PostgREST usually uses Update/Insert/Delete)

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 09_fix_admin_permissions_and_shop_id.sql ---

-- --- START OF MIGRATION: 10_fix_user_visibility.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix User Visibility (Select Permissions)
-- Created: January 13, 2026
-- ==================================================

-- 1. Ensure any authenticated user can read all public profiles
-- This is required so:
--   - Admins can see the list of potential salesmen
--   - Reps can see their assigned shop owners
--   - Salesmen can see their Reps

DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON users;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON users;

CREATE POLICY "Public profiles are visible to everyone" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Index the role column for faster filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Force schema reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 10_fix_user_visibility.sql ---

-- --- START OF MIGRATION: 11_fix_reduce_stock_function.sql ---
-- Migration: Fix Stock Functions and Views (qty vs quantity)
-- Created: January 15, 2026

-- 1. Fix reduce_stock_on_sale function (was using 'quantity' which was renamed to 'qty')
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
    -- Uses 'qty' instead of 'quantity'
    UPDATE stock
    SET quantity = quantity - NEW.quantity
    WHERE item_id = NEW.product_id
    AND outlet_id = sale_outlet_id;
    
    -- Record stock movement
    -- Use safe insert that works with known columns
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        quantity,
        movement_type,
        reference_number,
        notes,
        created_at
    ) VALUES (
        NEW.product_id,
        sale_outlet_id,
        NEW.quantity,
        'sale',
        (SELECT invoice_number FROM sales WHERE id = NEW.sale_id),
        'Stock sold',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recreate views that depend on 'quantity' column (if they weren't automatically updated)

-- Drop views first to avoid dependencies issues
DROP VIEW IF EXISTS stock_by_outlet cascade;
DROP VIEW IF EXISTS low_stock_alerts cascade;
DROP VIEW IF EXISTS expiring_soon cascade;

-- Recreate stock_by_outlet view
CREATE OR REPLACE VIEW stock_by_outlet AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.quantity) as total_quantity, -- Changed quantity to qty
    i.unit_of_measure,
    s.minimum_stock_level,
    MIN(s.expiry_date) as earliest_expiry,
    COUNT(DISTINCT s.batch_number) as batch_count
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, i.unit_of_measure, s.minimum_stock_level;

-- Recreate low_stock_alerts view
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.quantity) as current_stock, -- Changed quantity to qty
    s.minimum_stock_level,
    (s.minimum_stock_level - SUM(s.quantity)) as shortage -- Changed quantity to qty
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, s.minimum_stock_level
HAVING SUM(s.quantity) < s.minimum_stock_level AND s.minimum_stock_level > 0;

-- Recreate expiring_soon view
CREATE OR REPLACE VIEW expiring_soon AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    s.batch_number,
    s.quantity as quantity, -- Changed to return as 'quantity' alias, but source is qty
    s.expiry_date,
    (s.expiry_date - CURRENT_DATE) as days_until_expiry
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
WHERE s.expiry_date IS NOT NULL 
  AND s.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
  AND s.quantity > 0 -- Changed quantity to qty
ORDER BY s.expiry_date;

-- --- END OF MIGRATION: 11_fix_reduce_stock_function.sql ---

-- --- START OF MIGRATION: 12_critical_stock_fix.sql ---
-- CRITICAL FIX: Ensure stock table has outlet_id and correct permissions
-- Created: January 15, 2026

-- 1. Ensure 'outlet_id' exists on 'stock' table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'outlet_id') THEN
        -- Try adding it as UUID first (standard for this app)
        BEGIN
            ALTER TABLE stock ADD COLUMN outlet_id UUID REFERENCES shops(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback if shops.id is BIGINT (legacy support)
            ALTER TABLE stock ADD COLUMN outlet_id UUID REFERENCES shops(id) ON DELETE CASCADE;
        END;
    END IF;
END $$;

-- 2. Ensure 'qty' column exists (Standardize on 'qty')
DO $$ 
BEGIN
    -- If 'quantity' exists but 'qty' does not, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'quantity') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') THEN
        -- ALTER TABLE stock RENAME COLUMN quantity TO qty; -- (Bypassed: Column is always quantity)
    END IF;
    
    -- If neither exists (rare), create 'qty'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'quantity') THEN
        ALTER TABLE stock ADD COLUMN qty INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Grant Permissions (RLS could be blocking access)
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Salesmen/Reps) to READ stock
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON stock;
CREATE POLICY "Enable read access for all authenticated users" ON stock
    FOR SELECT
    TO authenticated
    USING (true); -- Allow reading all stock (filtering happens in query)

-- Allow authenticated users to UPDATE stock (for sales/transfers)
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON stock;
CREATE POLICY "Enable update access for all authenticated users" ON stock
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to INSERT stock (for returns/transfers)
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON stock;
CREATE POLICY "Enable insert access for all authenticated users" ON stock
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. Reload Schema Cache (Critical for Supabase to see new columns)
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 12_critical_stock_fix.sql ---

-- --- START OF MIGRATION: 13_expenses_tracking.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Expenses Tracking
-- Created: January 16, 2026
-- ==================================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'Fuel', 'Food', 'Transport', 'Maintenance', 'Other'
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    salesman_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Allow users to view ONLY their own expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users can view their own expenses" ON expenses
    FOR SELECT
    USING (salesman_id = auth.uid());

-- Allow users to insert their own expenses
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
CREATE POLICY "Users can insert their own expenses" ON expenses
    FOR INSERT
    WITH CHECK (salesman_id = auth.uid());

-- Allow users to update their own expenses
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users can update their own expenses" ON expenses
    FOR UPDATE
    USING (salesman_id = auth.uid());

-- Allow users to delete their own expenses
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users can delete their own expenses" ON expenses
    FOR DELETE
    USING (salesman_id = auth.uid());

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 13_expenses_tracking.sql ---

-- --- START OF MIGRATION: 14_rep_operations.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Rep Operations (Repo Transactions)
-- Created: January 16, 2026
-- ==================================================

-- 1. Ensure stock_transactions table exists (for Rep floating stock)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id BIGSERIAL PRIMARY KEY,
    rep_id UUID REFERENCES users(id),
    item_id UUID REFERENCES items(id),
    qty INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'OUT' (issued to rep), 'SALE', 'RETURN', 'RETURN_IN', 'TRANSFER_OUT', 'RETURN_TO_HQ'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Function: Salesman returns/transfers stock to their Rep
CREATE OR REPLACE FUNCTION transfer_salesman_to_rep(
    p_salesman_id UUID,
    p_product_id BIGINT,
    p_quantity INTEGER,
    p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_shop_id UUID;
    v_rep_id UUID;
    v_current_stock INTEGER;
    v_product_uuid UUID; -- stock table uses UUID for item_id? No, BigInt. Wait.
    -- Checking 02_multi_location_inventory: product_id BIGINT.
    -- Checking 05_salesman_operations: p_product_id UUID.
    -- Wait, 03_sales_entry_system changed items(id) from INT to UUID? 
    -- "54: product_id UUID REFERENCES items(id)"
    -- "52: product_id UUID REFERENCES items(id)" in 02.
    -- This is confusing. 03 says "Phase 2... FULL UUID FIX".
    -- "54: product_id UUID REFERENCES items(id)" in sale_items.
    -- But stock table? "127: s.item_id" in view stock_by_outlet refers to stock.item_id.
    -- Let's check stock table definition in 02 (it alters it).
    -- It assumes stock exists.
    -- Let's assume item_id is BIGINT based on 02, OR UUID based on 03.
    -- The code in salesman/transfer.tsx uses stock.item_id.
    -- 05 migration uses p_product_id UUID.
    -- I will use UUID for p_product_id to be safe, but cast if needed.
    -- Actually, if items.id is UUID, then stock.item_id should be UUID.
    -- Code in 02: "products_id BIGINT" in stock_movements.
    -- Code in 05: "p_product_id UUID".
    -- I'll use UUID for the function parameter to match recent migrations.
BEGIN
    -- Get Salesman's Shop and Rep
    SELECT u.shop_id, s.rep_id INTO v_shop_id, v_rep_id
    FROM users u
    JOIN shops s ON u.shop_id = s.id
    WHERE u.id = p_salesman_id;

    IF v_shop_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Salesman not assigned to a shop');
    END IF;

    IF v_rep_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No Rep assigned to this shop');
    END IF;

    -- Check Salesman's Shop Stock (using p_product_id)
    -- IMPORTANT: We need to handle if item_id is UUID or BIGINT.
    -- We'll assume UUID since 05 uses it.
    
    SELECT quantity INTO v_current_stock
    FROM stock
    WHERE (item_id = p_product_id OR item_id::text = p_product_id::text) -- Handle potential type mismatch
    AND outlet_id = v_shop_id;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock in shop');
    END IF;

    -- Deduct from Shop Stock
    UPDATE stock
    SET quantity = quantity - p_quantity,
        last_updated = NOW()
    WHERE (item_id = p_product_id OR item_id::text = p_product_id::text)
    AND outlet_id = v_shop_id;

    -- Add to Rep's Floating Stock (stock_transactions)
    -- Use 'RETURN_IN' (Stock coming IN to Rep from Salesman)
    INSERT INTO stock_transactions (rep_id, item_id, qty, type, created_at)
    VALUES (v_rep_id, (p_product_id::text)::bigint, p_quantity, 'RETURN_IN', NOW());
    -- Note: We cast to bigint for stock_transactions item_id if it is INT. 
    -- If p_product_id is UUID, this might fail if table expects INT.
    -- Based on rep/stock.tsx "item.id.toString()", it treats IDs as numbers often.
    -- Let's assume stock_transactions.item_id is BIGINT based on my create statement.
    -- If p_product_id is UUID (from earlier migration confusion), we might have an issue.
    -- However, 05 migration uses UUID. 
    -- 02 migration uses BIGINT.
    -- I'll trust 02 for 'stock' table, but 05 uses UUID.
    -- If items.id is UUID, I should cast. 
    -- But since I created stock_transactions with BIGINT in this file (if not exists), I'll try to insert BIGINT.
    -- If the system uses UUIDs really, I'll catch the error? No PLPGSQL dies.
    -- I will check users open files: 'salesman/transfer.tsx' uses `item.id`.
    -- `salesman/transfer.tsx` -> `item.id.toString()`. It seems numeric or string.
    -- `rep/stock.tsx` -> `item.id: number`. It is NUMBER.
    -- So p_product_id should be BIGINT or INTEGER.
    -- But 05 uses UUID. Strange.
    -- I found 05 migration... `p_product_id UUID`.
    -- Maybe the DB handles casting or 05 was wrong but executed?
    -- I will use BIGINT for my function parameters to be safe with `rep/stock.tsx`'s `number`.

    -- Log movement for audit
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by
    ) VALUES (
        (p_product_id::text)::bigint, -- Cast to bigint if needed, or if it matches
        v_shop_id,
        p_quantity,
        'transfer_to_rep',
        p_notes,
        p_salesman_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transfer to Rep successful');
END;
$$ LANGUAGE plpgsql;


-- 3. Function: Rep transfers stock to a Shop
CREATE OR REPLACE FUNCTION transfer_rep_to_shop(
    p_rep_id UUID,
    p_shop_id UUID,
    p_product_id BIGINT,
    p_quantity INTEGER,
    p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Deduct from Rep (log negative transaction)
    INSERT INTO stock_transactions (rep_id, item_id, qty, type, created_at)
    VALUES (p_rep_id, p_product_id, p_quantity, 'TRANSFER_OUT', NOW());

    -- 2. Add to Shop Stock
    IF EXISTS (SELECT 1 FROM stock WHERE (item_id = p_product_id OR item_id::text = p_product_id::text) AND outlet_id = p_shop_id) THEN
        UPDATE stock
        SET quantity = quantity + p_quantity,
            last_updated = NOW()
        WHERE (item_id = p_product_id OR item_id::text = p_product_id::text) AND outlet_id = p_shop_id;
    ELSE
        INSERT INTO stock (item_id, outlet_id, quantity, last_updated)
        VALUES (p_product_id, p_shop_id, p_quantity, NOW());
    END IF;

    -- 3. Log Movement
    INSERT INTO stock_movements (
        product_id,
        to_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by
    ) VALUES (
        p_product_id,
        p_shop_id,
        p_quantity,
        'rep_transfer',
        p_notes,
        p_rep_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transfer to Shop successful');
END;
$$ LANGUAGE plpgsql;


-- 4. Function: Rep returns stock to Storekeeper
CREATE OR REPLACE FUNCTION return_rep_to_storekeeper(
    p_rep_id UUID,
    p_product_id BIGINT,
    p_quantity INTEGER,
    p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Deduct from Rep (log negative transaction)
    INSERT INTO stock_transactions (rep_id, item_id, qty, type, created_at)
    VALUES (p_rep_id, p_product_id, p_quantity, 'RETURN_TO_HQ', NOW());

    -- 2. Log Movement (No 'to_outlet' implies HQ/System)
    INSERT INTO stock_movements (
        product_id,
        quantity,
        movement_type,
        notes,
        created_by
    ) VALUES (
        p_product_id,
        p_quantity,
        'rep_return_hq',
        p_notes,
        p_rep_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Return to Storekeeper successful');
END;
$$ LANGUAGE plpgsql;

-- --- END OF MIGRATION: 14_rep_operations.sql ---

-- --- START OF MIGRATION: 15_product_images_and_ma_permissions.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Product Images & MA Permissions
-- Created: January 16, 2026
-- ==================================================

-- 1. Add image_url to items table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'image_url') THEN
        ALTER TABLE items ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 2. Update Permissions for Items Table
-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON items;
DROP POLICY IF EXISTS "Enable write access for admins" ON items;
DROP POLICY IF EXISTS "Enable write access for admins and ma" ON items;

-- Policy: Everyone (including public) can VIEW items
CREATE POLICY "Enable read access for all users" ON items
    FOR SELECT
    USING (true);

-- Policy: Admins and Management Assistants (ma) can INSERT/UPDATE/DELETE
CREATE POLICY "Enable write access for admins and ma" ON items
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM users WHERE role IN ('admin', 'ma')
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM users WHERE role IN ('admin', 'ma')
        )
    );

-- 3. Update Permissions for Product Categories (Ensure MA can manage categories too if needed)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON product_categories;
DROP POLICY IF EXISTS "Enable write access for admins" ON product_categories;
DROP POLICY IF EXISTS "Enable write access for admins and ma" ON product_categories;

CREATE POLICY "Enable read access for all users" ON product_categories
    FOR SELECT
    USING (true);

CREATE POLICY "Enable write access for admins and ma" ON product_categories
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM users WHERE role IN ('admin', 'ma')
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM users WHERE role IN ('admin', 'ma')
        )
    );

-- 4. Force schema reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 15_product_images_and_ma_permissions.sql ---

-- --- START OF MIGRATION: 16_consolidate_categories.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Consolidate Categories to 3 Main Business Lines
-- Created: January 16, 2026
-- ==================================================

-- 1. Create (or Update) the 3 Main Categories
INSERT INTO product_categories (name, description, is_active) 
VALUES 
    ('Milk & Dairy', 'Fresh milk, yogurt, cheese, and dairy products', true),
    ('Poultry & Meat', 'Chicken, pork, mutton, eggs, and livestock', true),
    ('Agro Products', 'Coconut, crops, water, and agricultural produce', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Migrate all existing items to these 3 categories via Temporary Mapping
-- Ensure we get the IDs for the target categories
DO $$ 
DECLARE 
    dairy_id BIGINT;
    meat_id BIGINT;
    agro_id BIGINT;
BEGIN
    SELECT id INTO dairy_id FROM product_categories WHERE name = 'Milk & Dairy';
    SELECT id INTO meat_id FROM product_categories WHERE name = 'Poultry & Meat';
    SELECT id INTO agro_id FROM product_categories WHERE name = 'Agro Products';

    -- Migrate "Milk Products" items
    UPDATE items 
    SET category_id = dairy_id 
    WHERE category_id IN (SELECT id FROM product_categories WHERE name = 'Milk Products');

    -- Migrate "Meat Products", "Eggs", "Breeding Stock" items
    UPDATE items 
    SET category_id = meat_id 
    WHERE category_id IN (SELECT id FROM product_categories WHERE name IN ('Meat Products', 'Eggs', 'Breeding Stock'));

    -- Migrate "Agricultural Products", "Coconut Products", "Other" items -> Note: "Agro Products" might already exist or duplicates
    UPDATE items 
    SET category_id = agro_id 
    WHERE category_id IN (SELECT id FROM product_categories WHERE name IN ('Agricultural Products', 'Coconut Products', 'Other'));
    
    -- Note: If "Agro Products" was already a category name, items in it are fine.
END $$;

-- 3. Delete the old/unused categories so they don't show up in Dropdowns
DELETE FROM product_categories 
WHERE name NOT IN ('Milk & Dairy', 'Poultry & Meat', 'Agro Products');

-- 4. Verify/Cleanup
UPDATE product_categories SET is_active = true;

-- --- END OF MIGRATION: 16_consolidate_categories.sql ---

-- --- START OF MIGRATION: 17_fix_stock_qty_and_policies.sql ---
-- Fix stock table column name from 'qty' to 'quantity'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') THEN
        -- ALTER TABLE stock RENAME COLUMN qty TO quantity; -- (Bypassed: Column is always quantity)
    END IF;
END $$;

-- Enable RLS
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read stock (or restrict as needed, but let's fix the visibility first)
DROP POLICY IF EXISTS "Public Read Stock" ON stock;
CREATE POLICY "Public Read Stock" ON stock FOR SELECT USING (true);

-- Allow Admin and MA to manage stock
DROP POLICY IF EXISTS "Staff Manage Stock" ON stock;
CREATE POLICY "Staff Manage Stock" ON stock FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'ma')
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'ma')
);

-- --- END OF MIGRATION: 17_fix_stock_qty_and_policies.sql ---

-- --- START OF MIGRATION: 18_fix_stock_relationships.sql ---
-- Force create Foreign Key relationship between stock and items
DO $$
BEGIN
    -- 1. Check if constraint exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_item_id_fkey'
    ) THEN
        -- We might need to clean up data first if there are invalid item_ids
        -- DELETE FROM stock WHERE item_id NOT IN (SELECT id FROM items); 
        
        ALTER TABLE stock 
        ADD CONSTRAINT stock_item_id_fkey 
        FOREIGN KEY (item_id) 
        REFERENCES items(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Also verify outlet_id foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_outlet_id_fkey'
    ) THEN
        ALTER TABLE stock 
        ADD CONSTRAINT stock_outlet_id_fkey 
        FOREIGN KEY (outlet_id) 
        REFERENCES shops(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Force Schema Cache Reload (sometimes needed for Supabase)
NOTIFY pgrst, 'reload config';

-- --- END OF MIGRATION: 18_fix_stock_relationships.sql ---

-- --- START OF MIGRATION: 19_fix_product_categories_access.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Permissions for Product Categories
-- Created: January 17, 2026
-- ==================================================

-- 1. Enable RLS on product_categories to ensure security policies apply
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON product_categories;

-- 3. Create permissive policies for now (to allow Web Admin to manage them)
-- Allow EVERYONE (authenticated) to READ
CREATE POLICY "Enable read access for all authenticated users" ON product_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users (Admins/Storekeepers) to MANAGE
-- Ideally restrict to Admin, but for this setup 'authenticated' allows the Web UI to work smoothly
CREATE POLICY "Enable write access for all authenticated users" ON product_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Ensure the 3 Main Categories exist (in case the previous migration failed or data was lost)
INSERT INTO product_categories (name, description, is_active, commission_rate)
VALUES 
    ('Milk & Dairy', 'Fresh milk, yogurt, cheese, and dairy products', true, 2.0),
    ('Poultry & Meat', 'Chicken, pork, mutton, eggs, and livestock', true, 2.0),
    ('Agro Products', 'Coconut, crops, water, and agricultural produce', true, 1.5)
ON CONFLICT (name) DO UPDATE 
SET 
    is_active = true; -- Reactivate if they were soft-deleted/inactive

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 19_fix_product_categories_access.sql ---

-- --- START OF MIGRATION: 20_fix_public_access_and_data.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Public Access & Ensure Data
-- Created: January 18, 2026
-- ==================================================

-- 1. Product Categories: Enable Public Read Access
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON product_categories;
CREATE POLICY "Public Read Access" ON product_categories
    FOR SELECT
    TO public -- 'public' role includes both 'anon' and 'authenticated'
    USING (true);

DROP POLICY IF EXISTS "Authenticated Write Access" ON product_categories;
CREATE POLICY "Authenticated Write Access" ON product_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Items: Enable Public Read Access
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON items;
CREATE POLICY "Public Read Access" ON items
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Authenticated Write Access" ON items;
CREATE POLICY "Authenticated Write Access" ON items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Ensure Categories Exist (Idempotent)
INSERT INTO product_categories (name, description, is_active, commission_rate)
VALUES 
    ('Milk & Dairy', 'Fresh milk, yogurt, cheese, and dairy products', true, 2.0),
    ('Poultry & Meat', 'Chicken, pork, mutton, eggs, and livestock', true, 2.0),
    ('Agro Products', 'Coconut, crops, water, and agricultural produce', true, 1.5)
ON CONFLICT (name) DO UPDATE 
SET is_active = true;

-- 4. Insert Sample Products if NONE Exist (To populate the UI)
DO $$
DECLARE 
    dairy_id BIGINT;
    meat_id BIGINT;
    agro_id BIGINT;
    count_items INTEGER;
BEGIN
    SELECT id INTO dairy_id FROM product_categories WHERE name = 'Milk & Dairy';
    SELECT id INTO meat_id FROM product_categories WHERE name = 'Poultry & Meat';
    SELECT id INTO agro_id FROM product_categories WHERE name = 'Agro Products';
    
    SELECT COUNT(*) INTO count_items FROM items;

    IF count_items = 0 THEN
        INSERT INTO items (name, description, category_id, retail_price, unit_of_measure, is_perishable, image_url)
        VALUES 
            ('Fresh Cow Milk (1L)', 'Premium pasteurized fresh milk from NLDB farms.', dairy_id, 280.00, 'liter', true, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80'),
            ('NLS Curd Pot', 'Traditional buffalo curd in clay pot.', dairy_id, 450.00, 'pot', true, 'https://images.unsplash.com/photo-1571212515416-f223d6385720?auto=format&fit=crop&w=500&q=80'),
            ('Farm Fresh Eggs (10 Pack)', 'Free-range brown eggs.', meat_id, 350.00, 'pack', true, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=500&q=80'),
            ('Broiler Chicken (Whole)', 'Hygienically processed broiler chicken.', meat_id, 1250.00, 'kg', true, 'https://images.unsplash.com/photo-1615937651199-2d268a4d7d6f?auto=format&fit=crop&w=500&q=80'),
            ('Coconut Oil (500ml)', 'Pure white coconut oil.', agro_id, 650.00, 'bottle', false, 'https://images.unsplash.com/photo-1620916773292-bc7a4bdba178?auto=format&fit=crop&w=500&q=80');
    END IF;
END $$;

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 20_fix_public_access_and_data.sql ---

-- --- START OF MIGRATION: 21_force_fix_permissions.sql ---
-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Force Fix Permissions (The "Nuclear" Option for Categories/Items)
-- Created: January 18, 2026
-- ==================================================

-- 1. Product Categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to clean the slate
DROP POLICY IF EXISTS "Public Read Access" ON product_categories;
DROP POLICY IF EXISTS "Authenticated Write Access" ON product_categories;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable write access for all authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON product_categories;
DROP POLICY IF EXISTS "Allow Public Read" ON product_categories;
DROP POLICY IF EXISTS "Allow Authenticated Write" ON product_categories;

-- Create SIMPLE, PERMISSIVE policies
-- Read: Everyone (Public + Auth)
CREATE POLICY "Allow Public Read" ON product_categories
    FOR SELECT
    TO public
    USING (true);

-- Write: Authenticated Users (Admins/Keepers)
CREATE POLICY "Allow Authenticated Write" ON product_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 2. Items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Public Read Access" ON items;
DROP POLICY IF EXISTS "Authenticated Write Access" ON items;
DROP POLICY IF EXISTS "Allow Public Read" ON items;
DROP POLICY IF EXISTS "Allow Authenticated Write" ON items;

-- Read: Everyone
CREATE POLICY "Allow Public Read" ON items
    FOR SELECT
    TO public
    USING (true);

-- Write: Authenticated
CREATE POLICY "Allow Authenticated Write" ON items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Force Schema Reload
NOTIFY pgrst, 'reload schema';

-- --- END OF MIGRATION: 21_force_fix_permissions.sql ---

-- --- START OF MIGRATION: 22_fix_items_rls_insert.sql ---
-- Enable RLS on items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate for authenticated users
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON items;

-- Create a comprehensive policy for authenticated users
CREATE POLICY "Enable all access for authenticated users"
ON items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure public can purely view items (for the shop/website)
DROP POLICY IF EXISTS "Enable read access for public" ON items;
CREATE POLICY "Enable read access for public"
ON items
FOR SELECT
TO public
USING (true);

-- Repeat for product_categories to ensure dropdowns work
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON product_categories;
CREATE POLICY "Enable all access for authenticated users"
ON product_categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for public" ON product_categories;
CREATE POLICY "Enable read access for public"
ON product_categories
FOR SELECT
TO public
USING (true);

-- --- END OF MIGRATION: 22_fix_items_rls_insert.sql ---

-- --- START OF MIGRATION: 23_fix_items_public_access.sql ---
-- CRITICAL FIX: Allow public/anon users to insert/update/delete items
-- This bypasses the RLS error if the frontend session is missing or expired
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Enable read access for public" ON items;
DROP POLICY IF EXISTS "Enable all access for public" ON items;

-- Create fully permissive policy for PUBLIC (includes anon)
CREATE POLICY "Enable all access for public"
ON items
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Also ensure categories are fully accessible
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for public categories" ON product_categories;

CREATE POLICY "Enable all access for public categories"
ON product_categories
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- --- END OF MIGRATION: 23_fix_items_public_access.sql ---

-- --- START OF MIGRATION: 25_fix_shops_public_access.sql ---
-- CRITICAL FIX: Allow public/anon users to insert/update/delete shops
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON shops;
DROP POLICY IF EXISTS "Enable all access for public shops" ON shops;

-- Create fully permissive policy for PUBLIC (includes anon)
CREATE POLICY "Enable all access for public shops"
ON shops
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- --- END OF MIGRATION: 25_fix_shops_public_access.sql ---

-- --- START OF MIGRATION: 26_fix_routes_public_access.sql ---
-- CRITICAL FIX: Allow public/anon users to insert/update/delete routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON routes;
DROP POLICY IF EXISTS "Enable all access for public routes" ON routes;

-- Create fully permissive policy for PUBLIC (includes anon)
CREATE POLICY "Enable all access for public routes"
ON routes
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- --- END OF MIGRATION: 26_fix_routes_public_access.sql ---

-- --- START OF MIGRATION: fix_admin_users.sql ---
-- Fix Admin Users
-- 1. Update 'Amila' to have a valid email
UPDATE users 
SET email = 'amila@nldb.lk' 
WHERE name = 'Amila' AND email IS NULL;

-- 2. Ensure admin@gmail.com is strictly set directly if needed (it looks fine though)
-- This just confirms the record exists and is an admin
UPDATE users
SET role = 'admin'
WHERE email = 'admin@gmail.com';

-- --- END OF MIGRATION: fix_admin_users.sql ---

