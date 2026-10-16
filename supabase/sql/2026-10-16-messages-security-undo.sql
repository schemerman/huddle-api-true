-- Undo 2026-10-16-messages-security.sql: restores the previous (open) message rules.
-- Only use this if chat stops working after the security change.
begin;
drop policy if exists "messages_read_own" on public.messages;
drop policy if exists "messages_send_own" on public.messages;
drop policy if exists "messages_delete_own" on public.messages;
create policy "Allow public read access for messages" on public.messages for select to public using (true);
create policy "Allow public insert for messages" on public.messages for insert to public with check (true);
create policy "Allow public delete for messages" on public.messages for delete to public using (true);
create policy "Allow read DMs" on public.messages for select to public
  using ((huddle_id is not null) or ((auth.uid())::text = sender_id) or ((auth.uid())::text = recipient_id));
create policy "Allow DM inserts" on public.messages for insert to public with check ((auth.uid())::text = sender_id);
commit;
