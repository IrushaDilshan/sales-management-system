-- CRITICAL FIX: Allow public/anon users to insert/update/delete shops
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON shops;
DROP POLICY IF EXISTS "Enable all access for public shops" ON shops;

-- Create fully permissive policy for PUBLIC (includes anon)
CREATE POLICY "Enable all access for public shops"
ON shops
FOR ALL
TO public
USING (true)
WITH CHECK (true);
