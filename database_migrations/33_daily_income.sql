-- =====================================================
-- 33_daily_income.sql
-- Create daily_income table used by Web DailyIncome & Mobile App
-- =====================================================

CREATE TABLE IF NOT EXISTS public.daily_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cash_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
    credit_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_income_shop_date
    ON public.daily_income (shop_id, date DESC);

ALTER TABLE public.daily_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read daily_income" ON public.daily_income;
CREATE POLICY "Authenticated read daily_income" ON public.daily_income
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert daily_income" ON public.daily_income;
CREATE POLICY "Authenticated insert daily_income" ON public.daily_income
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update daily_income" ON public.daily_income;
CREATE POLICY "Authenticated update daily_income" ON public.daily_income
    FOR UPDATE USING (auth.role() = 'authenticated');
