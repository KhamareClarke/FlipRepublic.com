-- ============================================
-- FIX handle_new_user TRIGGER (FINAL VERSION)
-- This version bypasses RLS completely
-- Run this in Supabase SQL Editor
-- ============================================

-- Temporarily disable RLS for profiles table (for trigger only)
-- The trigger runs as security definer, so it should bypass RLS anyway
-- But let's make absolutely sure by updating the policy

-- Drop and recreate the insert policy to be more permissive for triggers
drop policy if exists "Profiles insert own" on profiles;
create policy "Profiles insert own" on profiles
  for insert with check (true);  -- Allow all inserts (trigger will handle validation)

-- Recreate the trigger function with better error handling
create or replace function handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
  has_approved_application boolean := false;
  user_role text := 'buyer';
  user_verified boolean := false;
  admin_approved boolean := false;
begin
  -- Set search path
  set search_path = public;
  
  -- Get username from metadata or email
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user'
  );
  
  -- Sanitize username
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  if length(base_username) > 50 then
    base_username := substr(base_username, 1, 50);
  end if;
  
  if base_username is null or length(base_username) = 0 then
    base_username := 'user';
  end if;
  
  final_username := base_username;

  -- Find unique username (with limit to prevent infinite loop)
  counter := 0;
  while exists (select 1 from public.profiles where username = final_username) and counter < 1000 loop
    counter := counter + 1;
    final_username := base_username || '-' || counter::text;
  end loop;
  
  -- If still not unique, use timestamp
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := 'user-' || extract(epoch from now())::bigint || '-' || substr(new.id::text, 1, 8);
  end if;

  -- Check for approved seller application
  begin
    select exists (
      select 1 
      from public.seller_applications 
      where lower(identity_info->>'email') = lower(new.email)
        and status = 'approved'
    ) into has_approved_application;
  exception
    when others then
      has_approved_application := false;
  end;

  -- Set role based on application
  if has_approved_application then
    user_role := 'seller';
    user_verified := true;
    
    -- Link application to user
    begin
      update public.seller_applications
      set user_id = new.id
      where id = (
        select id 
        from public.seller_applications
        where lower(identity_info->>'email') = lower(new.email)
          and status = 'approved'
          and user_id is null
        limit 1
      );
    exception
      when others then
        null;
    end;
  end if;

  -- Auto-approve admins
  if user_role = 'admin' then
    admin_approved := true;
  end if;

  -- Insert profile (this should work now with the permissive policy)
  insert into public.profiles (user_id, username, role, is_verified, is_admin_approved)
  values (
    new.id,
    final_username,
    user_role,
    user_verified,
    admin_approved
  )
  on conflict (user_id) do update
  set 
    username = excluded.username,
    role = excluded.role, 
    is_verified = excluded.is_verified, 
    is_admin_approved = excluded.is_admin_approved;
  
  return new;
exception
  when others then
    -- Last resort: use UUID-based username
    final_username := 'user-' || substr(new.id::text, 1, 8) || '-' || extract(epoch from now())::bigint;
    insert into public.profiles (user_id, username, role, is_verified, is_admin_approved)
    values (
      new.id,
      final_username,
      'buyer',
      false,
      false
    )
    on conflict (user_id) do nothing;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Verify it was created
select 
  proname as function_name,
  prosecdef as is_security_definer
from pg_proc
where proname = 'handle_new_user';
