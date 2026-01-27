-- ============================================
-- ADD VERIFICATION SYSTEM TABLES AND COLUMNS
-- Run this in Supabase SQL Editor
-- ============================================

-- Add is_admin_approved column to profiles table
alter table profiles 
add column if not exists is_admin_approved boolean not null default false;

-- Create verification_codes table
create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code text not null,
  email text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create indexes for verification_codes
create index if not exists idx_verification_codes_user_email on verification_codes(user_id, email);
create index if not exists idx_verification_codes_code on verification_codes(code) where used = false;

-- Enable RLS on verification_codes
alter table verification_codes enable row level security;

-- RLS policy for verification_codes (service role only)
drop policy if exists "Verification codes service role only" on verification_codes;
create policy "Verification codes service role only"
  on verification_codes
  for all
  using (auth.role() = 'service_role');
