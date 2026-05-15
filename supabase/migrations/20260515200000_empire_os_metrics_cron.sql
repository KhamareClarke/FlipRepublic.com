-- Empire OS metrics + cron-friendly indexes
create table if not exists empire_os_metrics (
  id uuid primary key default gen_random_uuid(),
  skill_id text not null,
  metric_name text not null,
  metric_value numeric not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_empire_os_metrics_skill on empire_os_metrics(skill_id, created_at desc);

alter table empire_os_metrics enable row level security;

create index if not exists idx_orders_escrow_release on orders(payout_release_at)
  where escrow_status = 'holding' and payout_release_at is not null;
