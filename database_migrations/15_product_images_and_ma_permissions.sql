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
