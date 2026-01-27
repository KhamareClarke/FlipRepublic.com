-- ============================================
-- FIX handle_new_user TRIGGER
-- Fixes potential null/empty username issues
-- Run this in Supabase SQL Editor
-- ============================================

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
      final_username := base_username || '-' || extract(epoch from now())::bigint;
      exit;
    end if;
  end loop;

  -- Check if there's an approved seller application for this email
  select exists (
    select 1 
    from public.seller_applications 
    where lower(identity_info->>'email') = lower(new.email)
      and status = 'approved'
  ) into has_approved_application;

  -- If approved application exists, set as seller
  if has_approved_application then
    user_role := 'seller';
    user_verified := true;
    
    -- Update the application to link it to this user (update first matching one)
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
  end if;

  -- Auto-approve admin accounts (admins don't need manual approval)
  if user_role = 'admin' then
    admin_approved := true;
  end if;

  -- Insert profile with error handling
  begin
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
  exception
    when others then
      -- Log error but don't fail user creation
      raise warning 'Error creating profile for user %: %', new.id, sqlerrm;
      -- Try with a timestamp-based username as fallback
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
  end;
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;
