-- Align order lifecycle with app + add updated_at for timelines.
-- Run once on existing databases.

alter table orders drop constraint if exists orders_status_check;

alter table orders add constraint orders_status_check
  check (status in ('paid', 'shipped', 'completed', 'refunded', 'cancelled'));

alter table orders add column if not exists updated_at timestamptz;

update orders set updated_at = coalesce(updated_at, created_at);

alter table orders alter column updated_at set default now();

alter table orders alter column updated_at set not null;
