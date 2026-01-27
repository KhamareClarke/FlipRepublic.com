-- ============================================
-- CREATE VERIFICATION CODE AUTOMATICALLY
-- This trigger creates a verification code when a user signs up
-- Run this in Supabase SQL Editor
-- ============================================

-- Function to generate verification code and send email
create or replace function create_verification_code_for_new_user()
returns trigger as $$
declare
  verification_code text;
  expires_at timestamptz;
begin
  set search_path = public;
  
  -- Generate 6-digit code
  verification_code := floor(100000 + random() * 900000)::text;
  
  -- Set expiration (15 minutes from now)
  expires_at := now() + interval '15 minutes';
  
  -- Insert verification code
  insert into public.verification_codes (
    user_id,
    code,
    email,
    expires_at,
    used
  ) values (
    new.id,
    verification_code,
    lower(trim(new.email)),
    expires_at,
    false
  );
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop existing trigger if any
drop trigger if exists on_user_created_send_verification on auth.users;

-- Create trigger
create trigger on_user_created_send_verification
  after insert on auth.users
  for each row execute procedure create_verification_code_for_new_user();
