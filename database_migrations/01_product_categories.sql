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
