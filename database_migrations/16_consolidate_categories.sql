-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Consolidate Categories to 3 Main Business Lines
-- Created: January 16, 2026
-- ==================================================

-- 1. Create (or Update) the 3 Main Categories
INSERT INTO product_categories (name, description, is_active) 
VALUES 
    ('Milk & Dairy', 'Fresh milk, yogurt, cheese, and dairy products', true),
    ('Poultry & Meat', 'Chicken, pork, mutton, eggs, and livestock', true),
    ('Agro Products', 'Coconut, crops, water, and agricultural produce', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Migrate all existing items to these 3 categories via Temporary Mapping
-- Ensure we get the IDs for the target categories
DO $$ 
DECLARE 
    dairy_id BIGINT;
    meat_id BIGINT;
    agro_id BIGINT;
BEGIN
    SELECT id INTO dairy_id FROM product_categories WHERE name = 'Milk & Dairy';
    SELECT id INTO meat_id FROM product_categories WHERE name = 'Poultry & Meat';
    SELECT id INTO agro_id FROM product_categories WHERE name = 'Agro Products';

    -- Migrate "Milk Products" items
    UPDATE items 
    SET category_id = dairy_id 
    WHERE category_id IN (SELECT id FROM product_categories WHERE name = 'Milk Products');

    -- Migrate "Meat Products", "Eggs", "Breeding Stock" items
    UPDATE items 
    SET category_id = meat_id 
    WHERE category_id IN (SELECT id FROM product_categories WHERE name IN ('Meat Products', 'Eggs', 'Breeding Stock'));

    -- Migrate "Agricultural Products", "Coconut Products", "Other" items -> Note: "Agro Products" might already exist or duplicates
    UPDATE items 
    SET category_id = agro_id 
    WHERE category_id IN (SELECT id FROM product_categories WHERE name IN ('Agricultural Products', 'Coconut Products', 'Other'));
    
    -- Note: If "Agro Products" was already a category name, items in it are fine.
END $$;

-- 3. Delete the old/unused categories so they don't show up in Dropdowns
DELETE FROM product_categories 
WHERE name NOT IN ('Milk & Dairy', 'Poultry & Meat', 'Agro Products');

-- 4. Verify/Cleanup
UPDATE product_categories SET is_active = true;
