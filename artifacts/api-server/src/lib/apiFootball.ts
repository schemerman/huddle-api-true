import { db, fixturesTable } from "@workspace/db";
import { logger } from "./logger";

const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY; 

export async function refreshFixtures(): Promise<{ count: number }> {
  if (!API_KEY) {
    logger.warn("ODDS_API_KEY not set");
    return { count: 0 };
  }

  // UPGRADE 1: Target the Premier League (soccer_epl) across global sportsbooks
  const url = `${BASE_URL}/sports/soccer_epl/odds/?apiKey=${API_KEY}&regions=uk,eu,us&markets=h2h&oddsFormat=decimal`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (!Array.isArray(data)) {
    return { count: 0 };
  }

  // Filter safely for Premier League
  const plMatches = data.filter((m: any) => 
    m.sport_key.includes("soccer_epl")
  );

  const rows = plMatches.map((match: any) => {
    // UPGRADE 2: Smart Bookmaker Selection
    let targetMarket = null;
    for (const bookie of match.bookmakers) {
      const foundMarket = bookie.markets.find((m: any) => m.key === 'h2h');
      if (foundMarket) {
        targetMarket = foundMarket;
        break; 
      }
    }

    const outcomes = targetMarket?.outcomes || [];
    const getOdd = (name: string) => outcomes.find((o: any) => o.name === name)?.price || 2.0;

    return {
      id: match.id,
      competition: "Premier League",
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