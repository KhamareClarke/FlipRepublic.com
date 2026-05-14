-- Analytics (views, search), full-text search column, escrow + disputes.
-- FKs use auth.users (no public.profiles required).

-- Full-text search on listings
alter table products add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(colorway, '')), 'D')
  ) stored;

create index if not exists products_search_tsv_idx on products using gin (search_tsv);

create table if not exists product_view_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  referrer text,
  utm_source text,
  utm_medium text,
  country_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_view_events_seller_created
  on product_view_events (seller_id, created_at desc);
create index if not exists idx_product_view_events_product
  on product_view_events (product_id, created_at desc);

create table if not exists search_events (
  id uuid primary key default gen_random_uuid(),
  query text,
  category_slug text,
  condition_filter text,
  brand_filter text,
  size_filter text,
  min_price numeric(10, 2),
  max_price numeric(10, 2),
  sort text,
  result_count int not null default 0,
  referrer text,
  utm_source text,
  utm_medium text,
  created_at timestamptz not null default now()
);

create index if not exists search_events_created_idx on search_events (created_at desc);

alter table orders add column if not exists payout_release_at timestamptz;

alter table orders add column if not exists escrow_status text default 'none';
update orders set escrow_status = 'none' where escrow_status is null;

alter table orders drop constraint if exists orders_escrow_status_check;
alter table orders add constraint orders_escrow_status_check
  check (escrow_status in ('none', 'holding', 'released', 'disputed'));

alter table orders alter column escrow_status set not null;

create table if not exists order_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved_refund', 'resolved_release', 'dismissed')),
  buyer_statement text not null default '',
  evidence_urls text[] not null default '{}',
  admin_notes text,
  admin_resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_disputes_order_unique unique (order_id)
);

create index if not exists idx_order_disputes_status on order_disputes (status);
