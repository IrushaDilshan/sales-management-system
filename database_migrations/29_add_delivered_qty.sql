-- Add delivered_qty to request_items table
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS delivered_qty INTEGER DEFAULT 0;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
