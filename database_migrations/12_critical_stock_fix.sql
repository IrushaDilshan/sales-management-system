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
            ALTER TABLE stock ADD COLUMN outlet_id BIGINT REFERENCES shops(id) ON DELETE CASCADE;
        END;
    END IF;
END $$;

-- 2. Ensure 'qty' column exists (Standardize on 'qty')
DO $$ 
BEGIN
    -- If 'quantity' exists but 'qty' does not, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'quantity') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') THEN
        ALTER TABLE stock RENAME COLUMN quantity TO qty;
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
