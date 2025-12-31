-- FIX: Real-Time Requests "19h ago" / Timezone Issue
-- Run this in your Supabase SQL Editor to ensure the created_at column supports precise timestamps.

-- 1. Ensure created_at exists and is the correct type (TIMESTAMPTZ)
-- This allows us to store the exact time the request was made, not just the date.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE requests ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;

-- 2. Update existing records
-- For records where created_at might be missing, fill it with the date (will be midnight, but better than null)
UPDATE requests SET created_at = date::timestamp WHERE created_at IS NULL;
