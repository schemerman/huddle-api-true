import { Router, type IRouter } from "express";
import { asc, gte } from "drizzle-orm";
import { db, fixturesTable } from "@workspace/db";
import { ListFixturesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/fixtures", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(gte(fixturesTable.startTime, new Date()))
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
