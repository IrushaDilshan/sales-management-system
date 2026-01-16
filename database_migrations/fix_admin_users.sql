-- Fix Admin Users
-- 1. Update 'Amila' to have a valid email
UPDATE users 
SET email = 'amila@nldb.lk' 
WHERE name = 'Amila' AND email IS NULL;

-- 2. Ensure admin@gmail.com is strictly set directly if needed (it looks fine though)
-- This just confirms the record exists and is an admin
UPDATE users
SET role = 'admin'
WHERE email = 'admin@gmail.com';
