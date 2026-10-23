-- Photos in comment replies, and comment rules that only let people act as themselves.
-- Runs as one transaction. Undo: 2026-10-23-comment-photos-undo.sql
begin;

-- 1. Somewhere to keep a reply's photo (a public link from the "uploads" bucket).
alter table public.comments add column if not exists image_url text;

-- 2. Rules. Before this, anyone could post a comment under someone else's name and delete any comment.
alter table public.comments enable row level security;

drop policy if exists "Allow public insert for comments" on public.comments;
drop policy if exists "Allow public delete for comments" on public.comments;
drop policy if exists comments_insert_own on public.comments;
drop policy if exists comments_delete_own_or_post_owner on public.comments;

-- Anyone signed in can reply, but only as themselves.
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (user_id = auth.uid()::text);

-- You can delete your own reply, or any reply on your own post.
create policy comments_delete_own_or_post_owner on public.comments
  for delete to authenticated
  using (
    user_id = auth.uid()::text
    or exists (select 1 from public.posts p where p.id = comments.post_id and p.user_id = auth.uid()::text)
  );

-- Reading stays open ("Allow public read access for comments" is unchanged).

commit;
