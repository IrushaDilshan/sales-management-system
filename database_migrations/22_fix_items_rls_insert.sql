-- Enable RLS on items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate for authenticated users
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON items;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON items;

-- Create a comprehensive policy for authenticated users
CREATE POLICY "Enable all access for authenticated users"
ON items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure public can purely view items (for the shop/website)
DROP POLICY IF EXISTS "Enable read access for public" ON items;
CREATE POLICY "Enable read access for public"
ON items
FOR SELECT
TO public
USING (true);

-- Repeat for product_categories to ensure dropdowns work
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON product_categories;
CREATE POLICY "Enable all access for authenticated users"
ON product_categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for public" ON product_categories;
CREATE POLICY "Enable read access for public"
ON product_categories
FOR SELECT
TO public
USING (true);
