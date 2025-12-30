-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Multi-Location Inventory
-- Created: December 30, 2025
-- ==================================================

-- 1. Add outlet_id to stock table for multi-location tracking
-- This allows tracking inventory at each farm/sales center separately
DO $$ 
BEGIN
    -- Add outlet_id if not exists (references shops table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'outlet_id') THEN
        ALTER TABLE stock ADD COLUMN outlet_id BIGINT REFERENCES shops(id);
    END IF;

    -- Add batch_number for lot tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'batch_number') THEN
        ALTER TABLE stock ADD COLUMN batch_number VARCHAR(50);
    END IF;

    -- Add manufacture_date for perishables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'manufacture_date') THEN
        ALTER TABLE stock ADD COLUMN manufacture_date DATE;
    END IF;

    -- Add expiry_date for perishables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'expiry_date') THEN
        ALTER TABLE stock ADD COLUMN expiry_date DATE;
    END IF;

    -- Add minimum_stock_level for alerts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'minimum_stock_level') THEN
        ALTER TABLE stock ADD COLUMN minimum_stock_level INTEGER DEFAULT 0;
    END IF;

    -- Add last_updated timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock' AND column_name = 'last_updated') THEN
        ALTER TABLE stock ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. Create stock_movements table for tracking all stock changes
CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    from_outlet_id BIGINT REFERENCES shops(id) ON DELETE SET NULL,
    to_outlet_id BIGINT REFERENCES shops(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'transfer', 'adjustment', 'sale', 'purchase', 'wastage'
    batch_number VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create wastage table for tracking spoilage and losses
CREATE TABLE IF NOT EXISTS wastage (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    outlet_id BIGINT REFERENCES shops(id) ON DELETE CASCADE,
    batch_number VARCHAR(50),
    quantity INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'expired', 'damaged', 'spoiled', 'other'
    notes TEXT,
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_outlet_id ON stock(outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_outlet ON stock(item_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_expiry_date ON stock(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_batch ON stock(batch_number);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_from_outlet ON stock_movements(from_outlet_id);
CREATE INDEX IF NOT EXISTS idx_movements_to_outlet ON stock_movements(to_outlet_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_wastage_product ON wastage(product_id);
CREATE INDEX IF NOT EXISTS idx_wastage_outlet ON wastage(outlet_id);
CREATE INDEX IF NOT EXISTS idx_wastage_date ON wastage(recorded_at);

-- 5. Add trigger to update last_updated on stock changes
CREATE OR REPLACE FUNCTION update_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stock_last_updated ON stock;
CREATE TRIGGER update_stock_last_updated
    BEFORE UPDATE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_timestamp();

-- 6. Add comments for documentation
COMMENT ON COLUMN stock.outlet_id IS 'Which outlet/farm this stock is located at';
COMMENT ON COLUMN stock.batch_number IS 'Batch/lot number for tracking and FIFO';
COMMENT ON COLUMN stock.manufacture_date IS 'When the product was manufactured/produced';
COMMENT ON COLUMN stock.expiry_date IS 'When the product expires (for perishables)';
COMMENT ON COLUMN stock.minimum_stock_level IS 'Alert when stock falls below this level';
COMMENT ON COLUMN stock.last_updated IS 'Last time stock was updated';

COMMENT ON TABLE stock_movements IS 'Tracks all stock movements between outlets and adjustments';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type: transfer, adjustment, sale, purchase, wastage';
COMMENT ON COLUMN stock_movements.reference_number IS 'Invoice/PO/Transfer number';

COMMENT ON TABLE wastage IS 'Tracks product wastage, spoilage, and losses';
COMMENT ON COLUMN wastage.reason IS 'Reason: expired, damaged, spoiled, other';

-- 7. Create a view for stock summary by outlet
CREATE OR REPLACE VIEW stock_by_outlet AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.quantity) as total_quantity,
    i.unit_of_measure,
    s.minimum_stock_level,
    MIN(s.expiry_date) as earliest_expiry,
    COUNT(DISTINCT s.batch_number) as batch_count
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, i.unit_of_measure, s.minimum_stock_level;

COMMENT ON VIEW stock_by_outlet IS 'Summary of stock levels by outlet and product';

-- 8. Create a view for low stock alerts
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.quantity) as current_stock,
    s.minimum_stock_level,
    (s.minimum_stock_level - SUM(s.quantity)) as shortage
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, s.minimum_stock_level
HAVING SUM(s.quantity) < s.minimum_stock_level AND s.minimum_stock_level > 0;

COMMENT ON VIEW low_stock_alerts IS 'Products below minimum stock level at each outlet';

-- 9. Create a view for expiring products (next 7 days)
CREATE OR REPLACE VIEW expiring_soon AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    s.batch_number,
    s.quantity,
    s.expiry_date,
    (s.expiry_date - CURRENT_DATE) as days_until_expiry
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
WHERE s.expiry_date IS NOT NULL 
  AND s.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
  AND s.quantity > 0
ORDER BY s.expiry_date;

COMMENT ON VIEW expiring_soon IS 'Products expiring in the next 7 days';

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check stock table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stock' 
ORDER BY ordinal_position;

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stock_movements', 'wastage')
ORDER BY table_name;

-- Check if views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('stock_by_outlet', 'low_stock_alerts', 'expiring_soon')
ORDER BY table_name;

-- Sample query: Stock by outlet
SELECT * FROM stock_by_outlet LIMIT 10;

-- Sample query: Low stock alerts
SELECT * FROM low_stock_alerts;

-- Sample query: Expiring products
SELECT * FROM expiring_soon;

-- ==================================================
-- SUCCESS!
-- Your database now supports:
-- ✅ Multi-location inventory tracking
-- ✅ Batch/lot tracking
-- ✅ Expiry date management
-- ✅ Stock movement history
-- ✅ Wastage tracking
-- ✅ Low stock alerts
-- ✅ Expiry alerts
--
-- Next step: Update the Stock management page in the web app
-- ==================================================
