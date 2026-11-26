-- =====================================================
-- 32_shops_outlet_type.sql
-- Add Outlet Type (Farm Shop / Milk Shop), Location, and Phone to shops
-- =====================================================

ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS outlet_type TEXT NOT NULL DEFAULT 'Farm Shop';

ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';

ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- Allow public read on shops so the Home page can display registered Farm & Milk Shops
DROP POLICY IF EXISTS "Public read shops" ON public.shops;
CREATE POLICY "Public read shops" ON public.shops
    FOR SELECT USING (true);
