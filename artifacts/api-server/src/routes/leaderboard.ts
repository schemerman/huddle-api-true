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
  // FIX 1: The Simple Maths
  // We use "as any" here just in case your exact Drizzle column names 
  // are slightly different (e.g. totalWagers instead of totalPicks).
  // If your database tracks wins differently, just change the variable names below!
  const total = (u as any).totalPicks || 0; 
  const won = (u as any).wonPicks || 0;
  
  // Calculate percentage and strictly protect against dividing by zero
  const calculatedWinRate = total > 0 ? Math.round((won / total) * 100) : 0;

  // FIX 2: The UUID Bypass
  // If the user hasn't set a proper username, the database defaults to their raw Auth UUID.
  // This logic checks if the username is massively long (like a UUID) and replaces it 
  // with their display name or a fallback so the UI looks completely clean.
  const isUUID = u.username && u.username.length > 20;
  const cleanUsername = isUUID ? (u.displayName || "Player") : u.username;

  return {
    userId: u.id,
    username: cleanUsername,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    points: u.points,
    winRate: calculatedWinRate, // We replaced the static property with our live math!
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