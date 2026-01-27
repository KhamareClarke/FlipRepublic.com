-- ============================================
-- CREATE VERIFICATION CODE FUNCTION
-- This function inserts verification codes with deferred constraint handling
-- Run this in Supabase SQL Editor
-- ============================================

create or replace function create_verification_code(
  p_user_id uuid,
  p_email text,
  p_code text,
  p_expires_at timestamptz
)
returns void as $$
begin
  set constraints all deferred;
  
  insert into public.verification_codes (
    user_id,
    code,
    email,
    expires_at,
    used
  ) values (
    p_user_id,
    p_code,
    lower(trim(p_email)),
    p_expires_at,
    false
  );
end;
$$ language plpgsql security definer set search_path = public;
