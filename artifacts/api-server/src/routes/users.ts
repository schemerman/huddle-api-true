import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
// 👇 Added fixturesTable to the imports 👇
import { db, usersTable, wagersTable, fixturesTable, type User as DbUser } from "@workspace/db";
import {
  SyncUserBody,
  GetUserParams,
  ListWagersParams,
  PlaceWagerParams,
  PlaceWagerBody,
  SettleWagerParams,
  SettleWagerBody,
  ClaimDailyParams,
  ClaimBailoutParams,
  SyncUserResponse,
  GetUserResponse,
  ListWagersResponse,
  PlaceWagerResponse,
  SettleWagerResponse,
  ClaimDailyResponse,
  ClaimBailoutResponse,
} from "@workspace/api-zod";
import {
  STARTING_BANKROLL,
  DAILY_AMOUNT,
  BAILOUT_AMOUNT,
  DAY_MS,
  nextBankrupt,
} from "../lib/economy";

const router: IRouter = Router();

function serializeUser(u: DbUser) {
  // 1. Dynamic Win Rate Math 
  const total = Number((u as any).totalPicks || (u as any).total_picks || 0);
  const won = Number((u as any).wonPicks || (u as any).won_picks || 0);
  const calculatedWinRate = total > 0 ? Math.round((won / total) * 100) : 0;

  // 2. UUID Bypass Logic
  const isUUID = u.username && u.username.length > 20;
  const cleanUsername = isUUID ? (u.displayName || "Player") : u.username;

  return {
    id: u.id,
    email: u.email,
    username: cleanUsername,
    displayName: u.displayName,
    dob: u.dob,
    avatarColor: u.avatarColor,
    winRate: calculatedWinRate,
    currentStreak: u.currentStreak,
    points: u.points,
    isBankrupt: u.isBankrupt,
    previousWagers: u.previousWagers,
    lastDailyClaim: u.lastDailyClaim ? u.lastDailyClaim.toISOString() : null,
    profileComplete: u.profileComplete,
  };
}

router.post("/users/sync", async (req, res): Promise<void> => {
  const parsed = SyncUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, input.id));

  let user: DbUser;
  if (!existing) {
    const fallbackName = input.email ? input.email.split("@")[0] : "";
    const chosenUsername = input.username && input.username.trim() !== "" ? input.username : fallbackName;
    const chosenDisplayName = input.displayName && input.displayName.trim() !== "" ? input.displayName : chosenUsername;

    [user] = await db
      .insert(usersTable)
      .values({
        id: input.id,
        email: input.email,
        username: chosenUsername,
        displayName: chosenDisplayName,
        dob: input.dob ?? "",
        ...(input.avatarColor ? { avatarColor: input.avatarColor } : {}),
        points: STARTING_BANKROLL,
        profileComplete: input.profileComplete ?? false,
      })
      .returning();
  } else {
    [user] = await db
      .update(usersTable)
      .set({
        email: input.email,
        ...(input.username && input.username.trim() !== "" ? { username: input.username } : {}),
        ...(input.displayName && input.displayName.trim() !== "" ? { displayName: input.displayName } : {}),
        ...(input.dob != null ? { dob: input.dob } : {}),
        ...(input.avatarColor != null ? { avatarColor: input.avatarColor } : {}),
        ...(input.profileComplete != null
          ? { profileComplete: input.profileComplete }
          : {}),
      })
      .where(eq(usersTable.id, input.id))
      .returning();
  }

  res.json(SyncUserResponse.parse(serializeUser(user)));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetUserResponse.parse(serializeUser(user)));
});

// 👇 THE FIX: JOINING THE FIXTURES TABLE TO GET THE SCORES 👇
router.get("/users/:id/wagers", async (req, res): Promise<void> => {
  const params = ListWagersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id } = params.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Use a leftJoin to grab the matching fixture data for every wager
  const rows = await db
    .select({
      wager: wagersTable,
      fixture: fixturesTable,
    })
    .from(wagersTable)
    .leftJoin(fixturesTable, eq(wagersTable.fixtureId, fixturesTable.id))
    .where(eq(wagersTable.userId, id))
    .orderBy(desc(wagersTable.createdAt));

  // Parse the base wager through the official API schema
  const parsedResponse = ListWagersResponse.parse(
    rows.map((row) => ({
      ...row.wager,
      createdAt: row.wager.createdAt.toISOString(),
      settledAt: row.wager.settledAt ? row.wager.settledAt.toISOString() : null,
    })),
  );

  // Safely re-attach the new scores and actual winner to bypass strict schema strippers
  const payload = parsedResponse.map((w, index) => ({
    ...w,
    homeScore: rows[index].fixture?.homeScore,
    awayScore: rows[index].fixture?.awayScore,
    homeTeam: rows[index].fixture?.homeTeam,
    awayTeam: rows[index].fixture?.awayTeam,
    actual_result: (rows[index].wager as any).actual_result,
  }));

  // Cast to any to send the extended payload to the phone
  res.json(payload as any);
});
// 👆 ---------------------------------------------------- 👆

router.post("/users/:id/wagers", async (req, res): Promise<void> => {
  const params = PlaceWagerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = PlaceWagerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { id } = params.data;
  const input = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .for("update");

    if (!user) return { code: 404 as const, error: "User not found" };
    if (user.points < input.amount) {
      return { code: 400 as const, error: "Insufficient points" };
    }

    const newPoints = user.points - input.amount;
    const [updated] = await tx
      .update(usersTable)
      .set({
        points: newPoints,
        isBankrupt: nextBankrupt(user.isBankrupt, newPoints),
        previousWagers: user.previousWagers + 1,
      })
      .where(eq(usersTable.id, id))
      .returning();

    const [wager] = await tx
      .insert(wagersTable)
      .values({
        id: randomUUID(),
        userId: id,
        fixtureId: input.fixtureId,
        choice: input.choice,
        question: input.question ?? "",
        prediction: input.prediction ?? "",
        amount: input.amount,
        odds: input.odds,
        potentialPayout: Math.floor(input.amount * input.odds),
        status: "pending",
        payout: 0,
      })
      .returning();

    return { code: 200 as const, user: updated, wager };
  });

  if (result.code !== 200) {
    res.status(result.code).json({ error: result.error });
    return;
  }

  res.json(
    PlaceWagerResponse.parse({
      user: serializeUser(result.user),
      wager: {
        ...result.wager,
        createdAt: result.wager.createdAt.toISOString(),
        settledAt: result.wager.settledAt
          ? result.wager.settledAt.toISOString()
          : null,
      },
    }),
  );
});

router.post(
  "/users/:id/wagers/:wagerId/settle",
  async (req, res): Promise<void> => {
    const params = SettleWagerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SettleWagerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { id, wagerId } = params.data;
    const { won } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .for("update");
      if (!user) return { code: 404 as const, error: "User not found" };

      const [wager] = await tx
        .select()
        .from(wagersTable)
        .where(eq(wagersTable.id, wagerId))
        .for("update");
      if (!wager || wager.userId !== id) {
        return { code: 404 as const, error: "Wager not found" };
      }
      if (wager.status !== "pending") {
        return { code: 400 as const, error: "Wager already settled" };
      }

      const payout = won ? wager.potentialPayout : 0;
      const newPoints = user.points + payout;
      
      const currentTotalPicks = (user as any).totalPicks || 0;
      const currentWonPicks = (user as any).wonPicks || 0;

      const [updatedUser] = await tx
        .update(usersTable)
        .set({
          points: newPoints,
          isBankrupt: nextBankrupt(user.isBankrupt, newPoints),
          totalPicks: currentTotalPicks + 1,
          wonPicks: won ? currentWonPicks + 1 : currentWonPicks,
        })
        .where(eq(usersTable.id, id))
        .returning();

      const [updatedWager] = await tx
        .update(wagersTable)
        .set({
          status: won ? "won" : "lost",
          payout,
          settledAt: new Date(),
        })
        .where(eq(wagersTable.id, wagerId))
        .returning();

      return { code: 200 as const, user: updatedUser, wager: updatedWager };
    });

    if (result.code !== 200) {
      res.status(result.code).json({ error: result.error });
      return;
    }

    res.json(
      SettleWagerResponse.parse({
        user: serializeUser(result.user),
        wager: {
          ...result.wager,
          createdAt: result.wager.createdAt.toISOString(),
          settledAt: result.wager.settledAt
            ? result.wager.settledAt.toISOString()
            : null,
        },
      }),
    );
  },
);

router.post("/users/:id/daily", async (req, res): Promise<void> => {
  const params = ClaimDailyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id } = params.data;

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .for("update");
    if (!user) return { code: 404 as const, error: "User not found" };

    const now = Date.now();
    const last = user.lastDailyClaim ? user.lastDailyClaim.getTime() : 0;
    if (now - last < DAY_MS) {
      return { code: 200 as const, user, claimed: false };
    }

    const newPoints = user.points + DAILY_AMOUNT;
    const [updated] = await tx
      .update(usersTable)
      .set({
        points: newPoints,
        isBankrupt: nextBankrupt(user.isBankrupt, newPoints),
        lastDailyClaim: new Date(now),
      })
      .where(eq(usersTable.id, id))
      .returning();

    return { code: 200 as const, user: updated, claimed: true };
  });

  if (result.code !== 200) {
    res.status(result.code).json({ error: result.error });
    return;
  }

  res.json(
    ClaimDailyResponse.parse({
      user: serializeUser(result.user),
      claimed: result.claimed,
    }),
  );
});

router.post("/users/:id/bailout", async (req, res): Promise<void> => {
  const params = ClaimBailoutParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id } = params.data;

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .for("update");
    if (!user) return { code: 404 as const, error: "User not found" };

    if (user.points > 0) {
      return { code: 200 as const, user, claimed: false };
    }

    const newPoints = user.points + BAILOUT_AMOUNT;
    const [updated] = await tx
      .update(usersTable)
      .set({
        points: newPoints,
        isBankrupt: nextBankrupt(user.isBankrupt, newPoints),
      })
      .where(eq(usersTable.id, id))
      .returning();

    return { code: 200 as const, user: updated, claimed: true };
  });

  if (result.code !== 200) {
    res.status(result.code).json({ error: result.error });
    return;
  }

  res.json(
    ClaimBailoutResponse.parse({
      user: serializeUser(result.user),
      claimed: result.claimed,
    }),
  );
});

export default router;