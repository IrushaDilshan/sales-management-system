-- STEP 1: Check what's referencing this user
-- Replace 'USER-ID-HERE' with the actual user ID you want to delete

-- Check requests (might use different column name)
SELECT COUNT(*) as count FROM requests WHERE id IN (
  SELECT id FROM requests -- requests might not reference users directly
);

-- Check daily_income
SELECT COUNT(*) as count FROM daily_income 
WHERE EXISTS (
  SELECT 1 FROM daily_income WHERE id = id -- check if column exists
);

-- Check stock_transactions  
SELECT COUNT(*) as transactions FROM stock_transactions WHERE rep_id = 'USER-ID-HERE';

-- Check routes
SELECT COUNT(*) as routes FROM routes WHERE rep_id = 'USER-ID-HERE';

-- STEP 2: Once you know what exists, delete in this order:

-- 1. Unassign from routes (safe - just removes assignment)
UPDATE routes SET rep_id = NULL WHERE rep_id = 'USER-ID-HERE';

-- 2. Remove stock transactions reference (safe - just clears rep reference)
UPDATE stock_transactions SET rep_id = NULL WHERE rep_id = 'USER-ID-HERE';

-- 3. Delete the user
DELETE FROM users WHERE id = 'USER-ID-HERE';
