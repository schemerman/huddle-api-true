-- One-time Supabase changes for photo posts, chat photos and live chat.
-- Safe to run more than once. Each numbered step runs on its own.

-- 1. Posts can carry a photo.
alter table public.posts add column if not exists image_url text;

-- 2. Public bucket for post and chat photos: 10 MB max, images only.
--    Paths are random, but anyone with a photo's link can view it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Signed-in users can upload only into their own folder (<user id>/...).
drop policy if exists "uploads_insert_own_folder" on storage.objects;
create policy "uploads_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Deliver new messages live to the other person's screen.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime for table public.messages;
  elsif not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
