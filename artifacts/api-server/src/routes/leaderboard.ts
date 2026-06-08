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

router.get("/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.profileComplete, true))
    .orderBy(desc(usersTable.points));

  res.json(GetLeaderboardResponse.parse(rows.map((u, i) => toEntry(u, i + 1))));
});

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

  const rows = await db
    .select()
    .from(usersTable)
    .where(
      and(eq(usersTable.profileComplete, true), inArray(usersTable.id, ids)),
    )
    .orderBy(desc(usersTable.points));

  res.json(
    GetMemberLeaderboardResponse.parse(rows.map((u, i) => toEntry(u, i + 1))),
  );
});

export default router;
