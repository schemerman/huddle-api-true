import { db, fixturesTable, wagersTable, usersTable } from "@workspace/db";
import { eq, and, lt, sql } from "drizzle-orm";
import { logger } from "./logger";

const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY;

export async function settleFinishedMatches(): Promise<{ settled: number }> {
  if (!API_KEY) {
    logger.warn("ODDS_API_KEY missing; cannot settle matches");
    return { settled: 0 };
  }

  // 1. Find matches that are in the past but still marked as 'pending'
  const pendingMatches = await db
    .select()
    .from(fixturesTable)
    .where(
      and(
        eq(fixturesTable.status, "pending"),
        lt(fixturesTable.startTime, new Date())
      )
    );

  if (pendingMatches.length === 0) {
    return { settled: 0 };
  }

  // 2. Fetch recent scores from the API
  const url = `${BASE_URL}/sports/soccer_fifa_world_cup/scores/?apiKey=${API_KEY}&daysFrom=1`;
  const res = await fetch(url);
  const data = await res.json();

  if (!Array.isArray(data)) return { settled: 0 };

  let settledCount = 0;

  // 3. Process the results and pay out winners
  for (const match of pendingMatches) {
    const apiMatch = data.find((m: any) => m.id === match.id);

    // If the API confirms the game is completely finished
    if (apiMatch && apiMatch.completed && apiMatch.scores) {
      const homeScoreObj = apiMatch.scores.find((s: any) => s.name === match.homeTeam);
      const awayScoreObj = apiMatch.scores.find((s: any) => s.name === match.awayTeam);

      if (homeScoreObj && awayScoreObj) {
        const homeScore = parseInt(homeScoreObj.score);
        const awayScore = parseInt(awayScoreObj.score);

        // Determine the actual winning team for the receipt cards
        let actualWinner = "Draw";
        if (homeScore > awayScore) actualWinner = match.homeTeam;
        if (homeScore < awayScore) actualWinner = match.awayTeam;

        // Update the fixture to show the final score and close it
        await db.update(fixturesTable)
          .set({
            homeScore,
            awayScore,
            status: "finished",
            updatedAt: new Date(),
          })
          .where(eq(fixturesTable.id, match.id));

        logger.info(`Match Finished: ${match.homeTeam} (${homeScore}) vs ${match.awayTeam} (${awayScore})`);

        // Grab every wager placed on this specific match
        const matchWagers = await db
          .select()
          .from(wagersTable)
          .where(eq(wagersTable.fixtureId, match.id));

        // Grade the papers and pay the winners
        for (const wager of matchWagers) {
          if (wager.status !== "pending") continue;

          let won = false;
          if (homeScore > awayScore && wager.choice === "A") won = true;
          if (homeScore === awayScore && wager.choice === "D") won = true;
          if (homeScore < awayScore && wager.choice === "B") won = true;

          const payout = won ? Math.floor(wager.amount * wager.odds) : 0;

          // Execute a raw SQL update to guarantee the new actual_result column saves perfectly
          await db.execute(sql`
            UPDATE wagers 
            SET status = ${won ? "won" : "lost"}, 
                payout = ${payout}, 
                actual_result = ${actualWinner} 
            WHERE id = ${wager.id}
          `);

          // Execute a raw SQL update to deposit points AND increment the win rate counters
          await db.execute(sql`
            UPDATE users 
            SET points = points + ${payout},
                total_picks = COALESCE(total_picks, 0) + 1,
                won_picks = COALESCE(won_picks, 0) + ${won ? 1 : 0}
            WHERE id = ${wager.userId}
          `);

          if (won) {
            logger.info(`Paid ${payout} pts to user ${wager.userId} for picking correctly!`);
          }
        }
        settledCount++;
      }
    }
  }

  return { settled: settledCount };
}