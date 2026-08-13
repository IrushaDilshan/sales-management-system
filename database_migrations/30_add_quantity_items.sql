-- Add quantity to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
