-- CRITICAL FIX: Allow public/anon users to insert/update/delete routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON routes;
DROP POLICY IF EXISTS "Enable all access for public routes" ON routes;

-- Create fully permissive policy for PUBLIC (includes anon)
CREATE POLICY "Enable all access for public routes"
ON routes
FOR ALL
TO public
USING (true)
WITH CHECK (true);
