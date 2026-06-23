import { Router, type IRouter } from "express";
import { desc, inArray } from "drizzle-orm";
import { db, usersTable, type User as DbUser } from "@workspace/db";
import {
  GetLeaderboardResponse,
  GetMemberLeaderboardBody,
  GetMemberLeaderboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toEntry(u: DbUser, rank: number) {
  // FIX 1: Bulletproof Data Extraction
  // We check for both camelCase and snake_case so the server catches 
  // the numbers no matter how the database formats the row.
  const total = Number((u as any).totalPicks || (u as any).total_picks || 0);
  const won = Number((u as any).wonPicks || (u as any).won_picks || 0);
  
  // Calculate percentage and strictly protect against dividing by zero
  const calculatedWinRate = total > 0 ? Math.round((won / total) * 100) : 0;

  // FIX 2: The UUID Bypass
  const isUUID = u.username && u.username.length > 20;
  const cleanUsername = isUUID ? (u.displayName || "Player") : u.username;

  return {
    userId: u.id,
    username: cleanUsername,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    points: u.points,
    winRate: calculatedWinRate, // Live math injected!
    rank,
  };
}

// GLOBAL LEADERBOARD: Shows everyone, no filters
router.get("/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.points)); 

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

  const rows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, ids)) 
    .orderBy(desc(usersTable.points));

  res.json(
    GetMemberLeaderboardResponse.parse(rows.map((u, i) => toEntry(u, i + 1))),
  );
});

export default router;