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
