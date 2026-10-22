import type { Fixture as ApiFixture } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

// Fixture times are stored in UTC without a zone suffix.
const asUtcIso = (value: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

/**
 * Upcoming fixtures straight from the database, in the same shape the API returned.
 * Reading Supabase directly means the Predict tab loads instantly even while the API server is asleep.
 */
export async function loadUpcomingFixtures(days = 14): Promise<ApiFixture[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * DAY_MS);
  const { data, error } = await supabase
    .from("fixtures")
    .select("id, competition, home_team, away_team, start_time, odds_home, odds_draw, odds_away")
    .gte("start_time", now.toISOString())
    .lte("start_time", until.toISOString())
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((f: any) => ({
    id: f.id,
    competition: f.competition,
    homeTeam: f.home_team,
    awayTeam: f.away_team,
    startTime: asUtcIso(f.start_time),
    oddsHome: Number(f.odds_home),
    oddsDraw: Number(f.odds_draw),
    oddsAway: Number(f.odds_away),
  }));
}
