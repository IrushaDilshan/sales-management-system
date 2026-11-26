-- =====================================================
-- 31_landing_cms.sql
-- Landing Page CMS: Images, Showcase Carousel Slides, & Public Outlets
-- =====================================================

-- 1. Landing Settings (Hero, About HQ, Quality Badge, Outlets BG)
CREATE TABLE IF NOT EXISTS public.landing_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hero_bg_url TEXT,
    hq_image_url TEXT,
    quality_badge_url TEXT,
    outlets_bg_url TEXT,
    hero_badge TEXT DEFAULT 'Pioneering Sustainable Agriculture',
    hero_subtitle TEXT DEFAULT 'Leading Sri Lanka through advanced genetic research, precision engineering, and a state-of-the-art biological infrastructure ensuring national food sovereignty.',
    about_description TEXT DEFAULT 'As the national authority, NLDB bridges the gap between traditional Sri Lankan farming and high-tech digital precision. We operate 40+ specialized farms focused on genetic optimization and production excellence.',
    contact_subtitle TEXT DEFAULT 'Our team is available for corporate inquiries, farm visit requests, and official tenders.',
    hq_title TEXT DEFAULT 'Narahenpita HQ',
    hq_address TEXT DEFAULT 'No. 40, Narahenpita Road, Colombo 05',
    hotline TEXT DEFAULT '+94 11 250 1701',
    email TEXT DEFAULT 'info@nldb.gov.lk',
    map_embed_url TEXT DEFAULT 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9960470593082!2d79.878808!3d6.891075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a30109230c7%3A0xfe80b3970bc8ed86!2sNational%20Livestock%20Development%20Board%20Head%20Office!5e0!3m2!1sen!2slk!4v1767198104940!5m2!1sen!2slk',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS contact_subtitle TEXT DEFAULT 'Our team is available for corporate inquiries, farm visit requests, and official tenders.';
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS hq_title TEXT DEFAULT 'Narahenpita HQ';
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS hq_address TEXT DEFAULT 'No. 40, Narahenpita Road, Colombo 05';
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS hotline TEXT DEFAULT '+94 11 250 1701';
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT 'info@nldb.gov.lk';
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS map_embed_url TEXT DEFAULT 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9960470593082!2d79.878808!3d6.891075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a30109230c7%3A0xfe80b3970bc8ed86!2sNational%20Livestock%20Development%20Board%20Head%20Office!5e0!3m2!1sen!2slk!4v1767198104940!5m2!1sen!2slk';

INSERT INTO public.landing_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 2. Showcase Carousel Slides (Rotating Product Showcase)
CREATE TABLE IF NOT EXISTS public.showcase_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'LIVESTOCK DAIRY',
    tagline TEXT NOT NULL DEFAULT '',
    ghost_text TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL,
    bg_color TEXT NOT NULL DEFAULT '#1e3a8a',
    accent_glow TEXT NOT NULL DEFAULT 'rgba(59, 130, 246, 0.4)',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default showcase slides if table is empty
INSERT INTO public.showcase_slides (name, category, tagline, ghost_text, image_url, bg_color, accent_glow, sort_order)
SELECT * FROM (VALUES
    ('NLDB Fresh UHT Milk', 'LIVESTOCK DAIRY', '100% pure fresh cow milk, pasteurized and sterilized for longer-lasting nutrition.', 'FRESH MILK', '/nldb/UHT.png', '#1e3a8a', 'rgba(59, 130, 246, 0.4)', 1),
    ('NLDB Chocolate Ice Cream', 'PREMIUM DESSERTS', 'Indulgently rich and creamy chocolate ice cream, made with fresh cream and finest cocoa.', 'CHOCO DELIGHT', '/nldb/chocklet_ice_cream (1).png', '#451a03', 'rgba(217, 119, 6, 0.4)', 2),
    ('NLDB Drinking Yoghurt', 'PROBIOTIC BEVERAGES', 'Deliciously refreshing dairy beverage, cultured to perfection with active probiotics.', 'YOGHURT DRINK', '/nldb/yorget_drink.png', '#831843', 'rgba(236, 72, 153, 0.4)', 3),
    ('NLDB Pure Ghee', 'ARTISANAL FATS', 'Clarified golden butter ghee, bringing rich traditional aroma and health benefits.', 'PURE GHEE', '/nldb/gee.png', '#78350f', 'rgba(245, 158, 11, 0.4)', 4),
    ('NLDB Strawberry Ice Cream', 'PREMIUM DESSERTS', 'Creamy real strawberry ice cream, infused with natural strawberry puree and farm fresh milk.', 'STRAWBERRY', '/nldb/stobery_ice_cream.png', '#9f1239', 'rgba(244, 63, 94, 0.4)', 5),
    ('NLDB Pure Buffalo Curd', 'TRADITIONAL DAIRY', 'Authentic rich and thick buffalo curd, set in clay pots using traditional cultures.', 'BUFFALO CURD', '/nldb/curd.png', '#1e293b', 'rgba(148, 163, 184, 0.4)', 6)
) AS v(name, category, tagline, ghost_text, image_url, bg_color, accent_glow, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.showcase_slides);

-- 3. Public Outlets (Global Outlets Section on Home Page)
CREATE TABLE IF NOT EXISTS public.public_outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    loc TEXT NOT NULL,
    tel TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'Regional',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default outlets if table is empty
INSERT INTO public.public_outlets (name, loc, tel, type, sort_order)
SELECT * FROM (VALUES
    ('Melsiripura Sale Center', 'Melsiripura', '0377 294 792', 'Major Center', 1),
    ('Mahaberithenna Sale Center', 'Digana', '0817 294 638', 'Farm Outlet', 2),
    ('Rosita Sale Center', 'Kotagala', '0515 675 404', 'Upcountry', 3),
    ('Koulwewa Sale Center', 'Peragaswela, Kuliyapitiya', '0377 294 112', 'Regional', 4),
    ('Narangalle Sale Center', 'Kithalawa', '0373 157 400', 'North Western', 5),
    ('Nikawaratiya Sale Center', 'Nikawaratiya', '0372 260 288', 'Regional', 6),
    ('Siringapatha Sale Center', 'Badalgama', '0312 269 204', 'Western', 7),
    ('Martin Sale Center', 'Bangadeniya', '0327 294 584', 'Regional', 8),
    ('Weerawila Sale Center', 'Thissamaharamaya', '0473 499 997', 'Southern', 9),
    ('Welisara Sale Center', 'Alpitiwala, Ragama', '0114 294 489', 'Major', 10),
    ('Beligama Sale Center', 'Beligamuwa', '0773 782 136', 'Regional', 11),
    ('Haragama Sale Center', 'Haragama, Gurudeniya', '0817 294 061', 'Regional', 12),
    ('Karandagolla Sale Center', 'Kundasale', '081 729 42 98', 'Regional', 13),
    ('Apeksha Hospital Center', 'Maharagama', '0114 294 489', 'Special', 14),
    ('Maawaththa Farm Center', 'Maawaththa', '031 225 5232', 'Farm Outlet', 15)
) AS v(name, loc, tel, type, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.public_outlets);

-- 4. Enable RLS
ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_outlets ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (Home Page)
DROP POLICY IF EXISTS "Public read landing_settings" ON public.landing_settings;
CREATE POLICY "Public read landing_settings" ON public.landing_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read showcase_slides" ON public.showcase_slides;
CREATE POLICY "Public read showcase_slides" ON public.showcase_slides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read public_outlets" ON public.public_outlets;
CREATE POLICY "Public read public_outlets" ON public.public_outlets FOR SELECT USING (true);

-- Authenticated Write Policies (Admin Portal)
DROP POLICY IF EXISTS "Authenticated manage landing_settings" ON public.landing_settings;
CREATE POLICY "Authenticated manage landing_settings" ON public.landing_settings
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated manage showcase_slides" ON public.showcase_slides;
CREATE POLICY "Authenticated manage showcase_slides" ON public.showcase_slides
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated manage public_outlets" ON public.public_outlets;
CREATE POLICY "Authenticated manage public_outlets" ON public.public_outlets
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. Storage Bucket for Landing Assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;
CREATE POLICY "Public read site-assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "Authenticated upload site-assets" ON storage.objects;
CREATE POLICY "Authenticated upload site-assets" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update site-assets" ON storage.objects;
CREATE POLICY "Authenticated update site-assets" ON storage.objects
    FOR UPDATE USING (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete site-assets" ON storage.objects;
CREATE POLICY "Authenticated delete site-assets" ON storage.objects
    FOR DELETE USING (bucket_id = 'site-assets' AND auth.role() = 'authenticated');
