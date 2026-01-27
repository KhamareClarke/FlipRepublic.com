create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where profiles.user_id = auth.uid()
    and profiles.role = 'admin'
    and profiles.is_banned = false
  );
$$ language sql stable;

create or replace function is_verified_seller()
returns boolean as $$
  select exists (
    select 1 from profiles
    where profiles.user_id = auth.uid()
    and profiles.role in ('seller', 'admin')
    and profiles.is_verified = true
    and profiles.is_banned = false
  );
$$ language sql stable;

alter table profiles enable row level security;
alter table seller_applications enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table trust_pillars enable row level security;
alter table offers enable row level security;
alter table orders enable row level security;
alter table saved_products enable row level security;
alter table payouts enable row level security;
alter table admin_actions enable row level security;

-- Verification codes table
alter table verification_codes enable row level security;

-- Verification codes: only service role can access
create policy "Verification codes service role only"
  on verification_codes
  for all
  using (auth.role() = 'service_role');

drop policy if exists "Profiles read own" on profiles;
create policy "Profiles read own" on profiles
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists "Profiles read verified sellers" on profiles;
create policy "Profiles read verified sellers" on profiles
  for select using (role = 'seller' and is_verified = true and is_banned = false);

drop policy if exists "Profiles update own" on profiles;
create policy "Profiles update own" on profiles
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

drop policy if exists "Profiles insert own" on profiles;
create policy "Profiles insert own" on profiles
  for insert with check (
    user_id = auth.uid()
    or auth.role() = 'service_role'
    or current_user in ('postgres', 'supabase_auth_admin')
  );

drop policy if exists "Seller apps insert own" on seller_applications;
create policy "Seller apps insert own" on seller_applications
  for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Seller apps read own" on seller_applications;
create policy "Seller apps read own" on seller_applications
  for select using (auth.uid() = user_id or is_admin());

drop policy if exists "Seller apps update admin" on seller_applications;
create policy "Seller apps update admin" on seller_applications
  for update using (is_admin())
  with check (is_admin());

drop policy if exists "Seller apps delete own pending" on seller_applications;
create policy "Seller apps delete own pending" on seller_applications
  for delete using (auth.uid() = user_id and status = 'pending');

drop policy if exists "Categories read all" on categories;
create policy "Categories read all" on categories
  for select using (true);

drop policy if exists "Categories admin write" on categories;
create policy "Categories admin write" on categories
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Products read marketplace" on products;
create policy "Products read marketplace" on products
  for select using (
    status in ('active', 'sold')
    or seller_id = auth.uid()
    or is_admin()
  );

drop policy if exists "Products create seller" on products;
create policy "Products create seller" on products
  for insert with check (
    seller_id = auth.uid() and is_verified_seller()
  );

drop policy if exists "Products update owner" on products;
create policy "Products update owner" on products
  for update using (
    seller_id = auth.uid() or is_admin()
  )
  with check (
    seller_id = auth.uid() or is_admin()
  );

drop policy if exists "Products delete owner" on products;
create policy "Products delete owner" on products
  for delete using (seller_id = auth.uid() or is_admin());

drop policy if exists "Product images read all" on product_images;
create policy "Product images read all" on product_images
  for select using (true);

drop policy if exists "Product images write owner" on product_images;
create policy "Product images write owner" on product_images
  for all using (
    exists (
      select 1 from products
      where products.id = product_images.product_id
      and (products.seller_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from products
      where products.id = product_images.product_id
      and (products.seller_id = auth.uid() or is_admin())
    )
  );

drop policy if exists "Trust pillars read all" on trust_pillars;
create policy "Trust pillars read all" on trust_pillars
  for select using (true);

drop policy if exists "Trust pillars admin write" on trust_pillars;
create policy "Trust pillars admin write" on trust_pillars
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Offers insert buyer" on offers;
create policy "Offers insert buyer" on offers
  for insert with check (buyer_id = auth.uid());

drop policy if exists "Offers read participants" on offers;
create policy "Offers read participants" on offers
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

drop policy if exists "Offers update participants" on offers;
create policy "Offers update participants" on offers
  for update using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin())
  with check (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

drop policy if exists "Orders read participants" on orders;
create policy "Orders read participants" on orders
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

drop policy if exists "Orders insert buyer" on orders;
create policy "Orders insert buyer" on orders
  for insert with check (buyer_id = auth.uid() or is_admin());

drop policy if exists "Saved products read own" on saved_products;
create policy "Saved products read own" on saved_products
  for select using (user_id = auth.uid());

drop policy if exists "Saved products write own" on saved_products;
create policy "Saved products write own" on saved_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Payouts read seller" on payouts;
create policy "Payouts read seller" on payouts
  for select using (seller_id = auth.uid() or is_admin());

drop policy if exists "Payouts admin write" on payouts;
create policy "Payouts admin write" on payouts
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin actions admin only" on admin_actions;
create policy "Admin actions admin only" on admin_actions
  for all using (is_admin()) with check (is_admin());
