-- ============================================
-- CONFIRM EMAIL FOR ADMIN ACCOUNT
-- This will confirm the email for clarkekhamare@gmail.com
-- ============================================

-- Confirm email for the admin user
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now())
WHERE email = 'clarkekhamare@gmail.com';

-- Verify email is confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'clarkekhamare@gmail.com';
