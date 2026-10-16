import { Router, type IRouter } from "express";
import { asc, gte, lte, and } from "drizzle-orm";
import { db, fixturesTable } from "@workspace/db";
import { ListFixturesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/fixtures", async (_req, res): Promise<void> => {
  // Grab the exact current time
  const now = new Date();

  // 14 days ahead, so the next Champions League round (every 2-3 weeks) shows early.
  // The app trims the Premier League section back to 7 days.
  const futureWindow = new Date();
  futureWindow.setDate(futureWindow.getDate() + 14);

  // Fetch matches happening between now and 14 days from now
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(
      and(
        gte(fixturesTable.startTime, now),
        lte(fixturesTable.startTime, futureWindow)
      )
    )
    .orderBy(asc(fixturesTable.startTime));

  const payload = rows.map((f) => ({
    id: f.id,
    competition: f.competition,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    startTime: f.startTime.toISOString(),
    oddsHome: f.oddsHome,
    oddsDraw: f.oddsDraw,
    oddsAway: f.oddsAway,
  }));

  res.json(ListFixturesResponse.parse(payload));
});

export default router;