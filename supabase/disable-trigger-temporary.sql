-- ============================================
-- TEMPORARILY DISABLE TRIGGER
-- This allows signup to work while we fix the trigger
-- Run this in Supabase SQL Editor
-- ============================================

-- Disable the trigger temporarily
drop trigger if exists on_auth_user_created on auth.users;

-- Verify it's disabled
select 
  tgname as trigger_name,
  tgenabled as is_enabled
from pg_trigger
where tgname = 'on_auth_user_created';

-- You should see no results (trigger is dropped)
