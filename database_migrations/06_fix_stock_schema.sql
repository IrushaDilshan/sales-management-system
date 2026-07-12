-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Stock Schema for Multi-Location
-- Created: January 8, 2026
-- ==================================================

-- 1. Ensure 'outlet_id' column exists in 'stock' table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'outlet_id') THEN
        ALTER TABLE stock ADD COLUMN outlet_id UUID REFERENCES shops(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure 'qty' column uses correct name (fix consistency if 'quantity' exists incorrectly)
DO $$ 
BEGIN
    -- If 'quantity' exists but 'qty' does not, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'quantity') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'qty') THEN
        ALTER TABLE stock RENAME COLUMN quantity TO qty;
    END IF;
END $$;

-- 3. Update existing stock records to have a valid outlet_id if null
-- We assign them to the first available shop to avoid 'orphaned' stock
DO $$
DECLARE
    v_default_shop_id UUID;
BEGIN
    SELECT id INTO v_default_shop_id FROM shops LIMIT 1;
    
    IF v_default_shop_id IS NOT NULL THEN
        UPDATE stock
        SET outlet_id = v_default_shop_id
        WHERE outlet_id IS NULL;
    END IF;
END $$;

-- 4. Update Unique Constraint to be (item_id, outlet_id) instead of just (item_id)
-- This allows the same item to exist in multiple shops
DO $$
BEGIN
    -- Drop existing constraints if they exist (names may vary, so we try standard names)
    -- We'll try to drop the constraint on item_id if it exists
    BEGIN
        ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_item_id_key;
        ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_pkey; -- If PK was just item_id
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if constraint doesn't exist
    END;

    -- Create new unique constraint on (item_id, outlet_id)
    -- Using coalesce for outlet_id to handle potential nulls if any remain (though we tried to fix them)
    -- Note: Unique constraints usually don't work well with NULLs, but we expect outlet_id to be set now.
    
    -- Option A: Composite Primary Key (Preferred if ID column doesn't exist)
    -- check if 'id' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'id') THEN
         -- Make composite PK
         ALTER TABLE stock ADD PRIMARY KEY (item_id, outlet_id);
    ELSE
         -- If ID exists, just add unique constraint
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_item_outlet_unique') THEN
             ALTER TABLE stock ADD CONSTRAINT stock_item_outlet_unique UNIQUE (item_id, outlet_id);
         END IF;
    END IF;

END $$;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_stock_outlet_item ON stock(outlet_id, item_id);
