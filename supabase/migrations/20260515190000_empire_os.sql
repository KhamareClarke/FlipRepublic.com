-- Empire OS: append-only event bus + actionable suggestions (human-in-the-loop; not autonomous ML).
create table if not exists empire_os_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}',
  actor_user_id uuid references auth.users(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  skills_applied text[] not null default '{}',
  processing_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_empire_os_events_type on empire_os_events(event_type);
create index if not exists idx_empire_os_events_created on empire_os_events(created_at desc);

create table if not exists empire_os_suggestions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete set null,
  suggestion_type text not null,
  message text not null,
  metadata jsonb not null default '{}',
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_empire_os_suggestions_open on empire_os_suggestions(created_at desc) where dismissed = false;

alter table empire_os_events enable row level security;
alter table empire_os_suggestions enable row level security;
