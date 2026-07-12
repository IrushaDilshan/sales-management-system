-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Fix Public Access & Ensure Data
-- Created: January 18, 2026
-- ==================================================

-- 1. Product Categories: Enable Public Read Access
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON product_categories;
CREATE POLICY "Public Read Access" ON product_categories
    FOR SELECT
    TO public -- 'public' role includes both 'anon' and 'authenticated'
    USING (true);

DROP POLICY IF EXISTS "Authenticated Write Access" ON product_categories;
CREATE POLICY "Authenticated Write Access" ON product_categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Items: Enable Public Read Access
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON items;
CREATE POLICY "Public Read Access" ON items
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Authenticated Write Access" ON items;
CREATE POLICY "Authenticated Write Access" ON items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Ensure Categories Exist (Idempotent)
INSERT INTO product_categories (name, description, is_active, commission_rate)
VALUES 
    ('Milk & Dairy', 'Fresh milk, yogurt, cheese, and dairy products', true, 2.0),
    ('Poultry & Meat', 'Chicken, pork, mutton, eggs, and livestock', true, 2.0),
    ('Agro Products', 'Coconut, crops, water, and agricultural produce', true, 1.5)
ON CONFLICT (name) DO UPDATE 
SET is_active = true;

-- 4. Insert Sample Products if NONE Exist (To populate the UI)
DO $$
DECLARE 
    dairy_id BIGINT;
    meat_id BIGINT;
    agro_id BIGINT;
    count_items INTEGER;
BEGIN
    SELECT id INTO dairy_id FROM product_categories WHERE name = 'Milk & Dairy';
    SELECT id INTO meat_id FROM product_categories WHERE name = 'Poultry & Meat';
    SELECT id INTO agro_id FROM product_categories WHERE name = 'Agro Products';
    
    SELECT COUNT(*) INTO count_items FROM items;

    IF count_items = 0 THEN
        INSERT INTO items (name, description, category_id, retail_price, unit_of_measure, is_perishable, image_url)
        VALUES 
            ('Fresh Cow Milk (1L)', 'Premium pasteurized fresh milk from NLDB farms.', dairy_id, 280.00, 'liter', true, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80'),
            ('NLS Curd Pot', 'Traditional buffalo curd in clay pot.', dairy_id, 450.00, 'pot', true, 'https://images.unsplash.com/photo-1571212515416-f223d6385720?auto=format&fit=crop&w=500&q=80'),
            ('Farm Fresh Eggs (10 Pack)', 'Free-range brown eggs.', meat_id, 350.00, 'pack', true, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=500&q=80'),
            ('Broiler Chicken (Whole)', 'Hygienically processed broiler chicken.', meat_id, 1250.00, 'kg', true, 'https://images.unsplash.com/photo-1615937651199-2d268a4d7d6f?auto=format&fit=crop&w=500&q=80'),
            ('Coconut Oil (500ml)', 'Pure white coconut oil.', agro_id, 650.00, 'bottle', false, 'https://images.unsplash.com/photo-1620916773292-bc7a4bdba178?auto=format&fit=crop&w=500&q=80');
    END IF;
END $$;

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
