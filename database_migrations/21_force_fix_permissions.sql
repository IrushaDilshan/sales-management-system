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
