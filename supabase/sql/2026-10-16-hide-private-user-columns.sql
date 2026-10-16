-- Hide email addresses and dates of birth from everyone using the app's public key.
-- The app can still read every column it needs (artifacts/mobile/lib/users.ts);
-- your own email comes from your sign-in session, not this table.
-- Apply only AFTER the app version that selects USER_COLUMNS is live: older app
-- versions select "*" from users, which this makes the database refuse.
-- Runs as one transaction. Undo: 2026-10-16-hide-private-user-columns-undo.sql
begin;

revoke select on public.users from anon, authenticated;

grant select (
  id, username, display_name, avatar_color, points, total_picks, won_picks, win_rate,
  current_streak, is_bankrupt, last_daily_claim, profile_complete, created_at, updated_at
) on public.users to anon, authenticated;

commit;
