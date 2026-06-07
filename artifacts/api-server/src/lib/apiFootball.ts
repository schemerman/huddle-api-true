import { lt } from "drizzle-orm";
import { db, fixturesTable } from "@workspace/db";
import { logger } from "./logger";

type FixtureRow = typeof fixturesTable.$inferInsert;

const RAPIDAPI_HOST = "api-football-v1.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}/v3`;

/**
 * World Cup league id in API-Football. The season is configurable because the
 * tournament only runs in specific years.
 */
const WORLD_CUP_LEAGUE_ID = process.env.APIFOOTBALL_LEAGUE_ID ?? "1";
const WORLD_CUP_SEASON = process.env.APIFOOTBALL_SEASON ?? "2026";

/** Cap how many fixtures we pull odds for, to stay within rate limits / cost. */
const MAX_FIXTURES = Number(process.env.APIFOOTBALL_MAX_FIXTURES ?? "15");

interface ApiFixture {
  fixture: { id: number; date: string };
  league: { name: string };
  teams: { home: { name: string }; away: { name: string } };
}

interface OddsValue {
  value: string;
  odd: string;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": RAPIDAPI_HOST,
  };
}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(apiKey) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API-Football ${res.status} for ${url}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Fetch upcoming World Cup fixtures. */
async function fetchUpcomingFixtures(apiKey: string): Promise<ApiFixture[]> {
  const url = `${BASE_URL}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}&next=${MAX_FIXTURES}`;
  const data = await fetchJson<{ response: ApiFixture[] }>(url, apiKey);
  return data.response ?? [];
}

/**
 * Fetch Match Winner (1X2) pre-match odds for a single fixture. Returns null if
 * odds are unavailable so the caller can fall back to defaults.
 */
async function fetchOdds(
  apiKey: string,
  fixtureId: number,
): Promise<{ home: number; draw: number; away: number } | null> {
  const url = `${BASE_URL}/odds?fixture=${fixtureId}&bet=1`;
  try {
    const data = await fetchJson<{
      response: {
        bookmakers: { bets: { id: number; values: OddsValue[] }[] }[];
      }[];
    }>(url, apiKey);

    const bet = data.response?.[0]?.bookmakers?.[0]?.bets?.find((b) => b.id === 1);
    if (!bet) return null;

    const find = (label: string) =>
      bet.values.find((v) => v.value.toLowerCase() === label)?.odd;
    const home = Number(find("home"));
    const draw = Number(find("draw"));
    const away = Number(find("away"));

    if (!home || !draw || !away) return null;
    return { home, draw, away };
  } catch (err) {
    logger.warn({ err, fixtureId }, "Failed to fetch odds; using defaults");
    return null;
  }
}

/**
 * Fetch upcoming World Cup fixtures + pre-match odds from API-Football and
 * upsert them into the local fixtures cache. This is the ONLY place the external
 * API is called — the frontend reads exclusively from the database.
 */
export async function refreshFixtures(): Promise<{ count: number }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    logger.warn("RAPIDAPI_KEY not set; skipping fixtures refresh");
    return { count: 0 };
  }

  logger.info("Refreshing fixtures from API-Football");
  const apiFixtures = await fetchUpcomingFixtures(apiKey);

  if (apiFixtures.length === 0) {
    logger.info("API-Football returned no upcoming fixtures");
    return { count: 0 };
  }

  // Fetch all external data (slow, networked) into memory FIRST, so the
  // database transaction below stays short and clients never observe a
  // partially-refreshed dataset.
  const rows: FixtureRow[] = [];
  for (const f of apiFixtures) {
    const odds = await fetchOdds(apiKey, f.fixture.id);
    rows.push({
      id: String(f.fixture.id),
      competition: f.league?.name ?? "",
      homeTeam: f.teams?.home?.name ?? "TBD",
      awayTeam: f.teams?.away?.name ?? "TBD",
      startTime: new Date(f.fixture.date),
      oddsHome: odds?.home ?? 2.0,
      oddsDraw: odds?.draw ?? 3.0,
      oddsAway: odds?.away ?? 2.0,
    });
  }

  // Apply atomically: upsert the fresh snapshot and prune past fixtures in a
  // single transaction so reads always see a consistent set.
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(fixturesTable)
        .values(row)
        .onConflictDoUpdate({
          target: fixturesTable.id,
          set: {
            competition: row.competition,
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            startTime: row.startTime,
            oddsHome: row.oddsHome,
            oddsDraw: row.oddsDraw,
            oddsAway: row.oddsAway,
          },
        });
    }
    await tx.delete(fixturesTable).where(lt(fixturesTable.startTime, new Date()));
  });

  logger.info({ count: rows.length }, "Fixtures refresh complete");
  return { count: rows.length };
}
