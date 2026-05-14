create extension if not exists pgcrypto;

create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  username text unique,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  is_verified boolean not null default false,
  is_admin_approved boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code text not null,
  email text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_codes_user_email on verification_codes(user_id, email);
create index if not exists idx_verification_codes_code on verification_codes(code) where used = false;

create table if not exists seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(user_id) on delete cascade,
  identity_info jsonb,
  store_info jsonb,
  banking_info jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image text,
  tagline text,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(user_id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  brand text not null,
  condition text not null,
  size text not null,
  price numeric(10, 2) not null,
  authenticated boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'sold', 'under_review')),
  description text,
  colorway text,
  release_year int,
  images_verified_at timestamptz,
  sku text,
  stock_quantity int not null default 1,
  track_inventory boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  body text not null default '',
  buyer_username text not null default '',
  created_at timestamptz not null default now(),
  constraint product_reviews_order_unique unique (order_id)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists conversations_unique_thread
  on conversations (buyer_id, seller_id, (coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)));

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists trust_pillars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  buyer_id uuid not null references profiles(user_id) on delete cascade,
  seller_id uuid not null references profiles(user_id) on delete cascade,
  offer_price numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'countered', 'withdrawn')),
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(user_id) on delete cascade,
  seller_id uuid not null references profiles(user_id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  amount numeric(10, 2) not null,
  status text not null default 'paid' check (status in ('paid', 'shipped', 'completed', 'refunded', 'cancelled')),
  stripe_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists saved_products (
  user_id uuid not null references profiles(user_id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(user_id) on delete cascade,
  amount numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  method text not null default 'Bank Transfer',
  created_at timestamptz not null default now()
);

create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(user_id) on delete cascade,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

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
  
  base_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || '-' || counter;
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

  insert into public.profiles (user_id, username, role, is_verified, is_admin_approved)
  values (
    new.id,
    final_username,
    user_role,
    user_verified,
    admin_approved
  )
  on conflict (user_id) do update
  set role = excluded.role, is_verified = excluded.is_verified, is_admin_approved = excluded.is_admin_approved;
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- === Extended by migrations (run SQL in Supabase): analytics, escrow, Stripe refund ids, category.filter_hints ===
-- See: supabase/migrations/20260515120000_analytics_search_escrow.sql
--      supabase/migrations/20260515140000_stripe_escrow_rls_hints.sql
--      supabase/migrations/20260515170000_inventory_coupons.sql
