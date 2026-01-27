-- ============================================
-- SET ADMIN ROLE - Run this in Supabase SQL Editor
-- ============================================

-- Method 1: Find your user ID by email
-- Replace 'your-email@example.com' with your actual email
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'your-email@example.com';

-- Method 2: Find all users and their profiles
SELECT 
  u.id as user_id,
  u.email,
  p.username,
  p.role,
  p.is_verified,
  p.is_banned
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;

-- Method 3: Set yourself as admin (replace USER_ID_HERE with your actual user ID)
-- You can get your user_id from Method 1 or Method 2 above
UPDATE profiles
SET 
  role = 'admin',
  is_verified = true
WHERE user_id = 'USER_ID_HERE';

-- Method 4: Set admin by email directly (if you know your email)
UPDATE profiles
SET 
  role = 'admin',
  is_verified = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Verify admin was set correctly
SELECT 
  u.email,
  p.username,
  p.role,
  p.is_verified
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin';
