-- Force create Foreign Key relationship between stock and items
DO $$
BEGIN
    -- 1. Check if constraint exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_item_id_fkey'
    ) THEN
        -- We might need to clean up data first if there are invalid item_ids
        -- DELETE FROM stock WHERE item_id NOT IN (SELECT id FROM items); 
        
        ALTER TABLE stock 
        ADD CONSTRAINT stock_item_id_fkey 
        FOREIGN KEY (item_id) 
        REFERENCES items(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Also verify outlet_id foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_outlet_id_fkey'
    ) THEN
        ALTER TABLE stock 
        ADD CONSTRAINT stock_outlet_id_fkey 
        FOREIGN KEY (outlet_id) 
        REFERENCES shops(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Force Schema Cache Reload (sometimes needed for Supabase)
NOTIFY pgrst, 'reload config';
