-- Undo 2026-10-16-hide-private-user-columns.sql: makes every users column readable again
-- (including email and date of birth). Only use this if the app can't load profiles.
begin;
grant select on public.users to anon, authenticated;
commit;
