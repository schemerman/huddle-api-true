-- Undo 2026-10-21-profiles-and-safety.sql (keeps the birth_date column and its data).
begin;
drop function if exists public.delete_my_account();
drop policy if exists "uploads_select_own_folder" on storage.objects;
drop policy if exists "uploads_delete_own_folder" on storage.objects;

-- Restore the previous message sending rule.
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

drop function if exists public.has_blocked(text, text);
drop table if exists public.blocks;
drop table if exists public.reports;
drop function if exists public.is_minor(text);
commit;
