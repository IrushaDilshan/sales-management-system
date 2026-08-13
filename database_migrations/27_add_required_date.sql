-- Add required_date to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS required_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 day');
