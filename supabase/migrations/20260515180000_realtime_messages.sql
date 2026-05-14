-- Realtime: required for live /messages updates (postgres_changes).
-- Replica identity allows full row payload for subscribers.
alter table public.messages replica identity full;

-- Add to Supabase Realtime publication (no-op if already added).
do $migration$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then
    null;
end;
$migration$;
