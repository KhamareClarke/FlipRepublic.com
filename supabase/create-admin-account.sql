-- ============================================
-- CREATE ADMIN ACCOUNT
-- Email: clarkekhamare@gmail.com
-- Password: 123456
-- ============================================

-- IMPORTANT: You cannot set passwords directly via SQL in Supabase
-- Passwords are hashed and managed by Supabase Auth

-- OPTION 1: Create user via Supabase Dashboard (RECOMMENDED)
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter email: clarkekhamare@gmail.com
-- 4. Enter password: 123456
-- 5. Uncheck "Auto Confirm User" if you want to verify email first
-- 6. Click "Create User"
-- 7. Then run the SQL below to set admin role

-- OPTION 2: Sign up via your app's signup page
-- 1. Go to http://localhost:3000/signup
-- 2. Enter email: clarkekhamare@gmail.com
-- 3. Enter password: 123456
-- 4. Sign up
-- 5. Then run the SQL below to set admin role

-- ============================================
-- After creating the user, run this to set admin role:
-- ============================================

-- Set admin role for clarkekhamare@gmail.com
UPDATE profiles
SET 
  role = 'admin',
  is_verified = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'clarkekhamare@gmail.com'
);

-- If profile doesn't exist yet, create it:
INSERT INTO profiles (user_id, username, role, is_verified)
SELECT 
  id,
  split_part(email, '@', 1) as username,
  'admin' as role,
  true as is_verified
FROM auth.users
WHERE email = 'clarkekhamare@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.users.id
  )
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin', is_verified = true;

-- Verify admin was set correctly
SELECT 
  u.email,
  p.username,
  p.role,
  p.is_verified,
  p.is_banned
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'clarkekhamare@gmail.com';
