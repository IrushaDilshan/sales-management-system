-- Migration: Fix Stock Functions and Views (qty vs quantity)
-- Created: January 15, 2026

-- 1. Fix reduce_stock_on_sale function (was using 'quantity' which was renamed to 'qty')
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    sale_outlet_id UUID;
BEGIN
    -- Get the outlet_id from the sale
    SELECT outlet_id INTO sale_outlet_id
    FROM sales
    WHERE id = NEW.sale_id;
    
    -- Reduce stock for this product at this outlet
    -- Uses 'qty' instead of 'quantity'
    UPDATE stock
    SET qty = qty - NEW.quantity
    WHERE item_id = NEW.product_id
    AND outlet_id = sale_outlet_id;
    
    -- Record stock movement
    -- Use safe insert that works with known columns
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        quantity,
        movement_type,
        reference_number,
        notes,
        created_at
    ) VALUES (
        NEW.product_id,
        sale_outlet_id,
        NEW.quantity,
        'sale',
        (SELECT invoice_number FROM sales WHERE id = NEW.sale_id),
        'Stock sold',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recreate views that depend on 'quantity' column (if they weren't automatically updated)

-- Drop views first to avoid dependencies issues
DROP VIEW IF EXISTS stock_by_outlet cascade;
DROP VIEW IF EXISTS low_stock_alerts cascade;
DROP VIEW IF EXISTS expiring_soon cascade;

-- Recreate stock_by_outlet view
CREATE OR REPLACE VIEW stock_by_outlet AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.qty) as total_quantity, -- Changed quantity to qty
    i.unit_of_measure,
    s.minimum_stock_level,
    MIN(s.expiry_date) as earliest_expiry,
    COUNT(DISTINCT s.batch_number) as batch_count
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, i.unit_of_measure, s.minimum_stock_level;

-- Recreate low_stock_alerts view
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    pc.name as category_name,
    SUM(s.qty) as current_stock, -- Changed quantity to qty
    s.minimum_stock_level,
    (s.minimum_stock_level - SUM(s.qty)) as shortage -- Changed quantity to qty
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
LEFT JOIN product_categories pc ON i.category_id = pc.id
GROUP BY s.outlet_id, sh.name, s.item_id, i.name, pc.name, s.minimum_stock_level
HAVING SUM(s.qty) < s.minimum_stock_level AND s.minimum_stock_level > 0;

-- Recreate expiring_soon view
CREATE OR REPLACE VIEW expiring_soon AS
SELECT 
    s.outlet_id,
    sh.name as outlet_name,
    s.item_id,
    i.name as product_name,
    s.batch_number,
    s.qty as quantity, -- Changed to return as 'quantity' alias, but source is qty
    s.expiry_date,
    (s.expiry_date - CURRENT_DATE) as days_until_expiry
FROM stock s
LEFT JOIN shops sh ON s.outlet_id = sh.id
LEFT JOIN items i ON s.item_id = i.id
WHERE s.expiry_date IS NOT NULL 
  AND s.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
  AND s.qty > 0 -- Changed quantity to qty
ORDER BY s.expiry_date;
