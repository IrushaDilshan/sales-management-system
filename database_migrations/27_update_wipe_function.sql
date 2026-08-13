-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Update Wipe Function (Safe Archival)
-- ==================================================

-- Replaces the delete_user_completely function with a much safer version that
-- preserves historical data in public.users but renames the email and wipes auth credentials.
-- This ensures that a user can always be re-registered without foreign key constraint errors.

CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_email TEXT;
BEGIN
    -- 1. Get the email of the target user
    SELECT email INTO target_email FROM public.users WHERE id = target_user_id;

    -- 2. Rename the email in public.users to free up the unique constraint
    -- We keep the row so that foreign keys (like sales history) don't crash.
    UPDATE public.users 
    SET email = email || '_archived_' || gen_random_uuid() 
    WHERE id = target_user_id;
    
    -- 3. Delete any orphaned identity fragments based on the user_id or email
    IF target_email IS NOT NULL THEN
        DELETE FROM auth.identities WHERE email = target_email;
    END IF;
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    
    -- 4. Delete the actual login credentials from auth system
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
