-- Fix RLS Policies for requests and request_items

-- 1. Requests Table
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Read" ON requests;
DROP POLICY IF EXISTS "Allow Authenticated Write" ON requests;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON requests;

CREATE POLICY "Allow Public Read" ON requests
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow Authenticated Write" ON requests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Request Items Table
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Read" ON request_items;
DROP POLICY IF EXISTS "Allow Authenticated Write" ON request_items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON request_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON request_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON request_items;

CREATE POLICY "Allow Public Read" ON request_items
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow Authenticated Write" ON request_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
