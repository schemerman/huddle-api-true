import { supabase } from "@/lib/supabase";

// Columns of the `users` table the app may read. Email and date of birth are deliberately
// left out: the database only lets the app read these columns
// (supabase/sql/2026-10-16-hide-private-user-columns.sql), so selecting "*" would fail.
// Your own email comes from the signed-in session instead.
export const USER_COLUMNS =
  "id, username, display_name, avatar_color, points, total_picks, won_picks, win_rate, current_streak, is_bankrupt, last_daily_claim, profile_complete, created_at, updated_at";

/** Usernames are lowercase letters, numbers and underscores, 3-20 characters. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function usernameProblem(username: string): string | null {
  if (username.length < 3) return "Username must be at least 3 characters (letters, numbers or _).";
  if (username.length > 20) return "Username can be at most 20 characters.";
  return null;
}

/** Asks the database whether nobody else has this username (capitalisation doesn't matter). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", { p_username: username });
  if (error) throw new Error("Couldn't check that username. Please try again.");
  return data === true;
}
