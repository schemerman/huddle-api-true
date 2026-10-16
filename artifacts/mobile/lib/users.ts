// Columns of the `users` table the app may read. Email and date of birth are deliberately
// left out: the database only lets the app read these columns
// (supabase/sql/2026-10-16-hide-private-user-columns.sql), so selecting "*" would fail.
// Your own email comes from the signed-in session instead.
export const USER_COLUMNS =
  "id, username, display_name, avatar_color, points, total_picks, won_picks, win_rate, current_streak, is_bankrupt, last_daily_claim, profile_complete, created_at, updated_at";
