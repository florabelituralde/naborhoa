-- AUTO-GENERATED companion migration (safe to edit).
-- Storage bucket that replaces Base44's UploadFile integration.
-- Base44 returned public URLs, so the bucket is public-read; only authenticated
-- users may upload. Widen the insert policy if guests must upload files.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "uploads public read"
  on storage.objects for select
  using (bucket_id = 'uploads');

create policy "uploads authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads');

create policy "uploads owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'uploads' and owner = auth.uid());

create policy "uploads owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and owner = auth.uid());
