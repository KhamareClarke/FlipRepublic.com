-- ============================================
-- CHECK AND FIX ADMIN ROLE
-- Run this to verify and set admin role
-- ============================================

-- First, check current profile status
SELECT 
  u.email,
  p.user_id,
  p.username,
  p.role,
  p.is_verified,
  p.is_admin_approved,
  p.is_banned
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'clarkekhamare@gmail.com';

-- Set role to admin and approve
UPDATE profiles
SET 
  role = 'admin',
  is_verified = true,
  is_admin_approved = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'clarkekhamare@gmail.com'
);

-- If profile doesn't exist, create it
INSERT INTO profiles (user_id, username, role, is_verified, is_admin_approved)
SELECT 
  id,
  split_part(email, '@', 1) as username,
  'admin' as role,
  true as is_verified,
  true as is_admin_approved
FROM auth.users
WHERE email = 'clarkekhamare@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.users.id
  )
ON CONFLICT (user_id) DO UPDATE
SET 
  role = 'admin',
  is_verified = true,
  is_admin_approved = true;

-- Verify it worked
SELECT 
  u.email,
  p.username,
  p.role,
  p.is_verified,
  p.is_admin_approved
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'clarkekhamare@gmail.com';
