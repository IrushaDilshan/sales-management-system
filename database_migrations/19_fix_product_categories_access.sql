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
