-- ============================================
-- COMPLETE FIX FOR VERIFICATION CODES
-- Run this in Supabase SQL Editor to fix all verification code issues
-- ============================================

-- Step 1: Make the foreign key constraint DEFERRED
-- This allows the constraint check to happen at the end of the transaction
ALTER TABLE verification_codes
DROP CONSTRAINT IF EXISTS verification_codes_user_id_fkey;

ALTER TABLE verification_codes
ADD CONSTRAINT verification_codes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 2: Create a function to insert verification codes (optional, but helpful)
CREATE OR REPLACE FUNCTION create_verification_code(
  p_user_id uuid,
  p_email text,
  p_code text,
  p_expires_at timestamptz
)
RETURNS void AS $$
BEGIN
  SET CONSTRAINTS ALL DEFERRED;
  
  INSERT INTO public.verification_codes (
    user_id,
    code,
    email,
    expires_at,
    used
  ) VALUES (
    p_user_id,
    p_code,
    lower(trim(p_email)),
    p_expires_at,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Verify the constraint was updated
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  condeferrable as is_deferrable,
  condeferred as is_deferred
FROM pg_constraint
WHERE conrelid = 'verification_codes'::regclass
  AND conname = 'verification_codes_user_id_fkey';

-- You should see: is_deferrable = true, is_deferred = true
