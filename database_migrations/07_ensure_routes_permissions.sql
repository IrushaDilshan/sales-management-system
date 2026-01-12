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
