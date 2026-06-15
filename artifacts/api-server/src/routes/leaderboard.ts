import { Router, type IRouter } from "express";
import { desc, eq, inArray, and } from "drizzle-orm";
import { db, usersTable, type User as DbUser } from "@workspace/db";
import {
  GetLeaderboardResponse,
  GetMemberLeaderboardBody,
  GetMemberLeaderboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toEntry(u: DbUser, rank: number) {
  return {
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    points: u.points,
    winRate: u.winRate,
    rank,
  };
}

// GLOBAL LEADERBOARD: Shows everyone, no filters
router.get("/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.points)); // Filter removed: Everyone shows up!

  res.json(GetLeaderboardResponse.parse(rows.map((u, i) => toEntry(u, i + 1))));
});

// MEMBER LEADERBOARD: Only shows users who are in the group (IDs provided in body)
router.post("/leaderboard/members", async (req, res): Promise<void> => {
  const parsed = GetMemberLeaderboardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ids = Array.from(new Set(parsed.data.userIds));
  if (ids.length === 0) {
    res.json(GetMemberLeaderboardResponse.parse([]));
    return;
  }

  // Still filters by ID, which is exactly what you want for specific groups
  const rows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, ids)) // Keep this filter: Only group members
    .orderBy(desc(usersTable.points));

  res.json(
    GetMemberLeaderboardResponse.parse(rows.map((u, i) => toEntry(u, i + 1))),
  );
});

export default router;