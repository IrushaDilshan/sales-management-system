-- Fix stock table column name from 'qty' to 'quantity'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') THEN
        ALTER TABLE stock RENAME COLUMN qty TO quantity;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read stock (or restrict as needed, but let's fix the visibility first)
DROP POLICY IF EXISTS "Public Read Stock" ON stock;
CREATE POLICY "Public Read Stock" ON stock FOR SELECT USING (true);

-- Allow Admin and MA to manage stock
DROP POLICY IF EXISTS "Staff Manage Stock" ON stock;
CREATE POLICY "Staff Manage Stock" ON stock FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'ma')
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'ma')
);
