import { db, fixturesTable } from "@workspace/db";
import { logger } from "./logger";

const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY; 

export async function refreshFixtures(): Promise<{ count: number }> {
  if (!API_KEY) {
    logger.warn("ODDS_API_KEY not set");
    return { count: 0 };
  }

  // We use a broader soccer key to ensure we get data, 
  // then filter for World Cup matches below.
  const url = `${BASE_URL}/sports/soccer_fifa_world_cup/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (!Array.isArray(data)) {
    return { count: 0 };
  }

  // Filter: ONLY accept matches that are World Cup games
  const worldCupMatches = data.filter((m: any) => 
    m.sport_key.includes("fifa_world_cup")
  );

  const rows = worldCupMatches.map((match: any) => {
    const bookmaker = match.bookmakers[0];
    const market = bookmaker?.markets.find((m: any) => m.key === 'h2h');
    const outcomes = market?.outcomes || [];
    const getOdd = (name: string) => outcomes.find((o: any) => o.name === name)?.price || 2.0;

    return {
      id: match.id,
      competition: "World Cup 2026",
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      startTime: new Date(match.commence_time),
      oddsHome: getOdd(match.home_team),
      oddsDraw: getOdd("Draw"),
      oddsAway: getOdd(match.away_team),
    };
  });

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx.insert(fixturesTable).values(row).onConflictDoUpdate({
        target: fixturesTable.id,
        set: row,
      });
    }
  });

  return { count: rows.length };
}