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
