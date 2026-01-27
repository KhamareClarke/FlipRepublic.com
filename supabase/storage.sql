insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

alter table storage.objects enable row level security;

drop policy if exists "Product images read" on storage.objects;
create policy "Product images read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Product images insert own" on storage.objects;
create policy "Product images insert own" on storage.objects
  for insert with check (bucket_id = 'product-images' and owner = auth.uid());

drop policy if exists "Product images update own" on storage.objects;
create policy "Product images update own" on storage.objects
  for update using (bucket_id = 'product-images' and owner = auth.uid());

drop policy if exists "Product images delete own" on storage.objects;
create policy "Product images delete own" on storage.objects
  for delete using (bucket_id = 'product-images' and owner = auth.uid());
