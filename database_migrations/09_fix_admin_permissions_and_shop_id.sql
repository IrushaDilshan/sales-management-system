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
