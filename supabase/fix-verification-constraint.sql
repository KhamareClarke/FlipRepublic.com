-- ============================================
-- FIX VERIFICATION CODES FOREIGN KEY CONSTRAINT
-- Makes the constraint deferred so it checks at end of transaction
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing constraint
ALTER TABLE verification_codes
DROP CONSTRAINT IF EXISTS verification_codes_user_id_fkey;

-- Recreate as deferred constraint (checks at end of transaction, not immediately)
ALTER TABLE verification_codes
ADD CONSTRAINT verification_codes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Verify the constraint was updated
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  condeferrable as is_deferrable,
  condeferred as is_deferred
FROM pg_constraint
WHERE conrelid = 'verification_codes'::regclass
  AND conname = 'verification_codes_user_id_fkey';
