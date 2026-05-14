-- Inventory: SKU, stock, optional tracking. Marketplace treats active+tracked+stock<=0 as unavailable.
alter table products add column if not exists sku text;
alter table products add column if not exists stock_quantity int not null default 1;
alter table products add column if not exists track_inventory boolean not null default true;

update products set stock_quantity = 1 where stock_quantity is null;
update products set track_inventory = true where track_inventory is null;

create unique index if not exists products_seller_sku_unique
  on products (seller_id, lower(trim(sku)))
  where sku is not null and trim(sku) <> '';

-- Coupons: seller_id null = platform-wide; optional product_id restricts to one listing.
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  seller_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  min_order_amount numeric(10, 2) not null default 0,
  max_redemptions int,
  redemption_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists coupons_code_lower_idx on coupons (lower(trim(code)));

alter table orders add column if not exists coupon_id uuid references coupons(id) on delete set null;
alter table orders add column if not exists discount_amount numeric(10, 2) not null default 0;

alter table coupons enable row level security;

comment on column products.stock_quantity is 'When track_inventory is true, must be > 0 to purchase; decremented on successful payment.';
comment on column coupons.seller_id is 'Null = platform coupon; otherwise must match product seller at checkout.';
