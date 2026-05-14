-- Reviews, messaging, product image verification timestamp
-- Run once on existing databases.

alter table products add column if not exists images_verified_at timestamptz;

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

create index if not exists idx_product_reviews_product_id on product_reviews(product_id);
create index if not exists idx_product_reviews_buyer_id on product_reviews(buyer_id);

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

create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at);

alter table product_reviews enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "Product reviews read all" on product_reviews;
create policy "Product reviews read all" on product_reviews
  for select using (true);

drop policy if exists "Product reviews insert buyer self" on product_reviews;
create policy "Product reviews insert buyer self" on product_reviews
  for insert with check (buyer_id = auth.uid());

drop policy if exists "Product reviews update own" on product_reviews;
create policy "Product reviews update own" on product_reviews
  for update using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

drop policy if exists "Conversations read participants" on conversations;
create policy "Conversations read participants" on conversations
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

drop policy if exists "Conversations insert buyer" on conversations;
create policy "Conversations insert participant" on conversations
  for insert with check (
    (auth.uid() = buyer_id or auth.uid() = seller_id)
    and buyer_id <> seller_id
  );

drop policy if exists "Conversations update participants" on conversations;
create policy "Conversations update participants" on conversations
  for update using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin())
  with check (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

drop policy if exists "Messages read conversation" on messages;
create policy "Messages read conversation" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or is_admin())
    )
  );

drop policy if exists "Messages insert sender" on messages;
create policy "Messages insert sender" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Messages update read receipts" on messages;
create policy "Messages update read receipts" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or is_admin())
    )
  );
