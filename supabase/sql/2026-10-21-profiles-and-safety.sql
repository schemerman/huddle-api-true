-- Profiles, teen safety, report/block and in-app account deletion.
-- Apply AFTER 2026-10-16-hide-private-user-columns.sql. Runs as one transaction.
-- Undo: 2026-10-21-profiles-and-safety-undo.sql
begin;

-- 1. A real date of birth, used for the 13+ check and teen protections.
--    Not readable through the app's public key (it isn't in the granted columns).
alter table public.users add column if not exists birth_date date;
update public.users
set birth_date = case
  when dob ~ '^\d{4}-\d{2}-\d{2}$' then to_date(dob, 'YYYY-MM-DD')
  when dob ~ '^\d{2}/\d{2}/\d{4}$' then to_date(dob, 'DD/MM/YYYY')
end
where birth_date is null and dob is not null and dob <> '';

-- Existing accounts already have a username, so they don't need the new "finish your profile" step.
update public.users set profile_complete = true
where coalesce(profile_complete, false) = false and coalesce(username, '') <> '';

-- 2. Is this user under 18? Unknown birth dates count as adults (older accounts were 18+ only).
create or replace function public.is_minor(p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select birth_date > (current_date - interval '18 years')::date from public.users where id = p_user_id), false);
$$;

-- 3. Reports: anyone signed in can report; nobody can read reports through the app.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'post', 'comment', 'message')),
  target_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid()::text);
grant insert on public.reports to authenticated;

-- 4. Blocks: you manage your own block list.
create table if not exists public.blocks (
  blocker_id text not null references public.users(id) on delete cascade,
  blocked_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks_read_own" on public.blocks;
create policy "blocks_read_own" on public.blocks for select to authenticated using (blocker_id = auth.uid()::text);
drop policy if exists "blocks_add_own" on public.blocks;
create policy "blocks_add_own" on public.blocks for insert to authenticated with check (blocker_id = auth.uid()::text and blocked_id <> blocker_id);
drop policy if exists "blocks_remove_own" on public.blocks;
create policy "blocks_remove_own" on public.blocks for delete to authenticated using (blocker_id = auth.uid()::text);
grant select, insert, delete on public.blocks to authenticated;

-- Has this person blocked that one? (Security definer: the sender can't see the recipient's block list.)
create or replace function public.has_blocked(p_blocker text, p_blocked text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.blocks where blocker_id = p_blocker and blocked_id = p_blocked);
$$;

-- 5. Sending messages: as before, plus a DM is refused if the recipient blocked you,
--    and a DM to an under-18 needs them to follow you first.
drop policy if exists "messages_send_own" on public.messages;
create policy "messages_send_own" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()::text
    and (
      (
        huddle_id is null and recipient_id is not null
        and not public.has_blocked(recipient_id, sender_id)
        and (
          not public.is_minor(recipient_id)
          or exists (select 1 from public.follows f where f.follower_id = recipient_id and f.following_id = sender_id)
        )
      )
      or (huddle_id is not null and public.is_huddle_member(huddle_id))
    )
  );

-- 6. Photos: you can list and delete files in your own uploads folder (used by account deletion).
drop policy if exists "uploads_select_own_folder" on storage.objects;
create policy "uploads_select_own_folder" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "uploads_delete_own_folder" on storage.objects;
create policy "uploads_delete_own_folder" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. Delete my account: removes everything belonging to the signed-in user, then the login itself.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := auth.uid()::text;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  delete from public.messages where sender_id = me or recipient_id = me;
  delete from public.posts where user_id = me;          -- their comments and likes cascade
  delete from public.comments where user_id = me;
  delete from public.post_likes where user_id = me;
  delete from public.follows where follower_id = me or following_id = me;
  delete from public.wagers where user_id = me;
  delete from public.blocks where blocker_id = me or blocked_id = me;
  delete from public.reports where reporter_id = me;

  update public.leagues set member_ids = array_remove(member_ids, me) where me = any(member_ids);
  delete from public.leagues where coalesce(array_length(member_ids, 1), 0) = 0;

  delete from public.users where id = me;
  delete from auth.users where id::text = me;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
