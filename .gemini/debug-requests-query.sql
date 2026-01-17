-- Check if requests table has salesman_id column and data
-- Run this in Supabase SQL Editor

-- 1. Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'requests';

-- 2. Check all requests in the table
SELECT 
    id,
    shop_id,
    salesman_id,
    status,
    date,
    created_at
FROM requests
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count requests by salesman_id
SELECT 
    salesman_id,
    COUNT(*) as request_count
FROM requests
GROUP BY salesman_id;

-- 4. Check if salesman_id column exists and has data
SELECT 
    COUNT(*) as total_requests,
    COUNT(salesman_id) as requests_with_salesman_id,
    COUNT(*) - COUNT(salesman_id) as requests_without_salesman_id
FROM requests;
