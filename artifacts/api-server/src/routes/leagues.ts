import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

// 1. Create a Huddle
router.post("/leagues", async (req, res) => {
  const { name, userId } = req.body;
  if (!name || !userId) return res.status(400).json({ error: "Missing data" });

  const code = name.replace(/\s/g, "").toUpperCase().substring(0, 6) + Math.floor(Math.random() * 99);

  const [newLeague] = await db
    .insert(leaguesTable)
    .values({
      id: randomUUID(),
      name,
      code,
      ownerId: userId,
      memberIds: [userId],
    })
    .returning();

  res.json(newLeague);
});

// 2. Join a Huddle
router.post("/leagues/join", async (req, res) => {
  const { code, userId } = req.body;

  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.code, code));
  if (!league) return res.status(404).json({ error: "Huddle not found" });

  if (!league.memberIds.includes(userId)) {
    const updatedMembers = [...league.memberIds, userId];
    await db.update(leaguesTable).set({ memberIds: updatedMembers }).where(eq(leaguesTable.id, league.id));
    league.memberIds = updatedMembers;
  }

  res.json({ success: true, league });
});

// 3. Leave a Huddle
router.post("/leagues/leave", async (req, res) => {
  const { leagueId, userId } = req.body;

  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, leagueId));
  if (!league) return res.status(404).json({ error: "Not found" });

  const updatedMembers = league.memberIds.filter((id: string) => id !== userId);
  await db.update(leaguesTable).set({ memberIds: updatedMembers }).where(eq(leaguesTable.id, leagueId));

  res.json({ success: true });
});

// 4. Fetch My Huddles
router.get("/leagues/:userId", async (req, res) => {
  const { userId } = req.params;
  const allLeagues = await db.select().from(leaguesTable);
  const myLeagues = allLeagues.filter(l => l.memberIds.includes(userId));
  res.json(myLeagues);
});

export default router;