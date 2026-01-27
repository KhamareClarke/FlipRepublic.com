-- ============================================
-- AUTO-APPROVE ADMIN ACCOUNTS
-- Run this to approve existing admin accounts
-- ============================================

-- Approve all existing admin accounts
UPDATE profiles
SET is_admin_approved = true
WHERE role = 'admin' AND is_admin_approved = false;

-- Or approve specific admin by email:
UPDATE profiles
SET is_admin_approved = true
WHERE role = 'admin' 
  AND user_id = (SELECT id FROM auth.users WHERE email = 'clarkekhamare@gmail.com');

-- Verify the update
SELECT 
  u.email,
  p.username,
  p.role,
  p.is_verified,
  p.is_admin_approved
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin';
