-- Undo 2026-10-23-comment-photos.sql: restores the old open comment rules and removes the photo column.
begin;
drop policy if exists comments_insert_own on public.comments;
drop policy if exists comments_delete_own_or_post_owner on public.comments;
create policy "Allow public insert for comments" on public.comments for insert with check (true);
create policy "Allow public delete for comments" on public.comments for delete using (true);
alter table public.comments drop column if exists image_url;
commit;
