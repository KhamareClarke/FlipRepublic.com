-- Stripe refund columns, category smart-filter hints, RLS lock-down for analytics/disputes.

alter table orders add column if not exists stripe_payment_intent_id text;
alter table orders add column if not exists stripe_refund_id text;

alter table categories add column if not exists filter_hints jsonb not null default '{}'::jsonb;

alter table product_view_events enable row level security;
alter table search_events enable row level security;
alter table order_disputes enable row level security;

-- No policies: deny direct client access (API uses service role / admin client).
