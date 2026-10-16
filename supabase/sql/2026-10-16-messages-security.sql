-- Lock down chat messages. Signed-in users can only read and send their own DMs,
-- and only read and post in huddles they are a member of.
-- Before this, anyone with the app's public key could read, add or delete any message.
-- Runs as one transaction, so chat is never left half-locked.
-- Undo: 2026-10-16-messages-security-undo.sql
begin;

-- Is the signed-in user a member of this huddle? (Huddles live in leagues.member_ids.)
create or replace function public.is_huddle_member(p_huddle_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.leagues l
    where l.id = p_huddle_id and auth.uid()::text = any (l.member_ids)
  );
$$;

-- Remove the old open rules.
drop policy if exists "Allow public read access for messages" on public.messages;
drop policy if exists "Allow public insert for messages" on public.messages;
drop policy if exists "Allow public delete for messages" on public.messages;
drop policy if exists "Allow read DMs" on public.messages;
drop policy if exists "Allow DM inserts" on public.messages;

alter table public.messages enable row level security;

-- Read: your own DMs, and messages in huddles you belong to.
drop policy if exists "messages_read_own" on public.messages;
create policy "messages_read_own" on public.messages
  for select to authenticated
  using (
    sender_id = auth.uid()::text
    or recipient_id = auth.uid()::text
    or (huddle_id is not null and public.is_huddle_member(huddle_id))
  );

-- Send: only as yourself; a DM needs a recipient, a huddle post needs membership.
drop policy if exists "messages_send_own" on public.messages;
create policy "messages_send_own" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()::text
    and (
      (huddle_id is null and recipient_id is not null)
      or (huddle_id is not null and public.is_huddle_member(huddle_id))
    )
  );

-- Delete: only messages you sent.
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete to authenticated
  using (sender_id = auth.uid()::text);

commit;
