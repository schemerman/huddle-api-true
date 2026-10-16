import { db, fixturesTable } from "@workspace/db";
import { logger } from "./logger";

const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY;

// Competitions offered on the Predict tab. `name` is stored in fixtures.competition and
// must match the app's section names (artifacts/mobile/app/(tabs)/predict.tsx) and
// results.ts (which ESPN scoreboard settles it).
const COMPETITIONS = [
  { sportKey: "soccer_epl", name: "Premier League" },
  { sportKey: "soccer_uefa_champs_league", name: "Champions League" },
] as const;

// One region keeps each call at 1 Odds API credit (cost = regions x markets).
const REGIONS = "uk";

type Competition = (typeof COMPETITIONS)[number];

async function fetchCompetition(competition: Competition) {
  const url = `${BASE_URL}/sports/${competition.sportKey}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;
  const res = await fetch(url);
  const data = await res.json();
  const credits = { remaining: res.headers.get("x-requests-remaining"), used: res.headers.get("x-requests-used") };

  if (!Array.isArray(data)) {
    // Usually an invalid key or no credits left; say so instead of failing silently.
    logger.warn({ competition: competition.name, status: res.status, message: (data as any)?.message, ...credits }, "Odds API did not return fixtures");
    return [];
  }
  logger.info({ competition: competition.name, events: data.length, ...credits }, "Odds API fixtures fetched");

  // Exact match: the API also has e.g. "soccer_uefa_champs_league_qualification".
  return data
    .filter((match: any) => match.sport_key === competition.sportKey)
    .map((match: any) => {
      // Use the first bookmaker that offers a match-result (win/draw/win) market.
      let targetMarket = null;
      for (const bookie of match.bookmakers ?? []) {
        const foundMarket = bookie.markets?.find((m: any) => m.key === "h2h");
        if (foundMarket) {
          targetMarket = foundMarket;
          break;
        }
      }
      const outcomes = targetMarket?.outcomes || [];
      const getOdd = (name: string) => outcomes.find((o: any) => o.name === name)?.price || 2.0;

      return {
        id: match.id,
        competition: competition.name,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        startTime: new Date(match.commence_time),
        oddsHome: getOdd(match.home_team),
        oddsDraw: getOdd("Draw"),
        oddsAway: getOdd(match.away_team),
      };
    });
}

export async function refreshFixtures(): Promise<{ count: number; byCompetition: Record<string, number> }> {
  if (!API_KEY) {
    logger.warn("ODDS_API_KEY not set");
    return { count: 0, byCompetition: {} };
  }

  const byCompetition: Record<string, number> = {};
  let count = 0;
  // Each competition is fetched and saved on its own, so one failing doesn't block the other.
  for (const competition of COMPETITIONS) {
    try {
      const rows = await fetchCompetition(competition);
      await db.transaction(async (tx) => {
        for (const row of rows) {
          await tx.insert(fixturesTable).values(row).onConflictDoUpdate({
            target: fixturesTable.id,
            set: row,
          });
        }
      });
      byCompetition[competition.name] = rows.length;
      count += rows.length;
    } catch (err) {
      logger.error({ err, competition: competition.name }, "Fixtures refresh failed for competition");
      byCompetition[competition.name] = 0;
    }
  }

  return { count, byCompetition };
}
