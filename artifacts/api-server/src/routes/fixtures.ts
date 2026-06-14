import { Router, type IRouter } from "express";
import { asc, gte, lte, and } from "drizzle-orm";
import { db, fixturesTable } from "@workspace/db";
import { ListFixturesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/fixtures", async (_req, res): Promise<void> => {
  // Grab the exact current time
  const now = new Date();

  // Create a boundary for the end of the current day (11:59 PM)
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch matches happening strictly between NOW and MIDNIGHT
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(
      and(
        gte(fixturesTable.startTime, now),
        lte(fixturesTable.startTime, endOfDay)
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