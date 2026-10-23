-- Undo 2026-10-23-instant-daily-bonus.sql (the app then needs the API route again).
begin;
drop function if exists public.claim_daily_bonus();
commit;
