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
