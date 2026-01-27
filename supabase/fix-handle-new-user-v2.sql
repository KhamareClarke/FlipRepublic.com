-- ============================================
-- FIX handle_new_user TRIGGER (V2)
-- Ensures RLS is bypassed and handles all edge cases
-- Run this in Supabase SQL Editor
-- ============================================

-- First, ensure the function owner can bypass RLS
-- The function runs as security definer, so it should bypass RLS
-- But let's make sure the RLS policy allows service_role

-- Update RLS policy to allow trigger inserts
drop policy if exists "Profiles insert own" on profiles;
create policy "Profiles insert own" on profiles
  for insert with check (
    user_id = auth.uid()
    or auth.role() = 'service_role'
    or current_user in ('postgres', 'supabase_auth_admin', 'authenticator')
    or pg_catalog.current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Now recreate the trigger function
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
  set search_path = public;
  
  -- Get username from metadata or email, ensure it's not null/empty
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user'
  );
  
  -- Sanitize username (remove special characters, limit length)
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  if length(base_username) > 50 then
    base_username := substr(base_username, 1, 50);
  end if;
  
  -- Ensure base_username is not empty
  if base_username is null or length(base_username) = 0 then
    base_username := 'user';
  end if;
  
  final_username := base_username;

  -- Find unique username
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || '-' || counter::text;
    
    -- Safety check to prevent infinite loop
    if counter > 1000 then
      final_username := 'user-' || extract(epoch from now())::bigint || '-' || substr(new.id::text, 1, 8);
      exit;
    end if;
  end loop;

  -- Check if there's an approved seller application for this email
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

  -- If approved application exists, set as seller
  if has_approved_application then
    user_role := 'seller';
    user_verified := true;
    
    -- Update the application to link it to this user
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
        -- Ignore update errors
        null;
    end;
  end if;

  -- Auto-approve admin accounts
  if user_role = 'admin' then
    admin_approved := true;
  end if;

  -- Insert profile - use security definer to bypass RLS
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
    -- If all else fails, try with a guaranteed unique username
    final_username := 'user-' || extract(epoch from now())::bigint || '-' || substr(new.id::text, 1, 8);
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
end;
$$ language plpgsql security definer set search_path = public;

-- Verify trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
