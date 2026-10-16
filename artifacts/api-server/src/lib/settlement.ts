import { db, fixturesTable, wagersTable, type Fixture, type Wager } from "@workspace/db";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { SOLVENT_THRESHOLD } from "./economy";
import { createResultFinder } from "./results";

// A match is treated as over two hours after kick-off.
const SETTLE_AFTER_MS = 2 * 60 * 60 * 1000;
// Requests from the app can arrive often; don't re-check results more than this.
const MIN_INTERVAL_MS = 5 * 60 * 1000;

export type SettlementResult = {
  checked: number;
  settled: number;
  unmatched: string[];
  skipped?: boolean;
  failed?: boolean;
};

type Pick = "A" | "D" | "B";

function pickFor(wager: Wager, fixture: Fixture): Pick | null {
  const choice = String(wager.choice ?? "").trim().toUpperCase();
  if (choice === "A" || choice === "D" || choice === "B") return choice;
  // Older picks may only carry the team name.
  const prediction = String(wager.prediction ?? "").trim().toLowerCase();
  if (prediction === "draw") return "D";
  if (prediction && prediction === fixture.homeTeam.toLowerCase()) return "A";
  if (prediction && prediction === fixture.awayTeam.toLowerCase()) return "B";
  return null;
}

/**
 * Record a final score and pay out every pending pick on that match, all in one
 * transaction. A pick is only paid if it is still pending when it is updated,
 * so overlapping runs can never pay the same pick twice.
 */
export async function settleFixture(fixture: Fixture, homeScore: number, awayScore: number): Promise<number> {
  const outcome: Pick = homeScore > awayScore ? "A" : homeScore < awayScore ? "B" : "D";
  const actualWinner = outcome === "A" ? fixture.homeTeam : outcome === "B" ? fixture.awayTeam : "Draw";

  return db.transaction(async (tx) => {
    await tx
      .update(fixturesTable)
      .set({ homeScore, awayScore, status: "finished", updatedAt: new Date() })
      .where(eq(fixturesTable.id, fixture.id));

    const pending = await tx
      .select()
      .from(wagersTable)
      .where(and(eq(wagersTable.fixtureId, fixture.id), eq(wagersTable.status, "pending")));

    let graded = 0;
    for (const wager of pending) {
      const pick = pickFor(wager, fixture);
      if (!pick) {
        logger.warn({ wagerId: wager.id, choice: wager.choice, prediction: wager.prediction }, "Could not read pick; left pending");
        continue;
      }
      const won = pick === outcome;
      const payout = won ? Math.floor(wager.amount * wager.odds) : 0;

      const updated = await tx.execute(sql`
        UPDATE wagers
        SET status = ${won ? "won" : "lost"},
            payout = ${payout},
            actual_result = ${actualWinner},
            settled_at = now()
        WHERE id = ${wager.id} AND status = 'pending'
        RETURNING id
      `);
      if (updated.rows.length === 0) continue;

      // Right-hand sides use the old row values, so "points + payout" is the new balance.
      await tx.execute(sql`
        UPDATE users
        SET points = points + ${payout},
            total_picks = COALESCE(total_picks, 0) + 1,
            won_picks = COALESCE(won_picks, 0) + ${won ? 1 : 0},
            is_bankrupt = CASE
              WHEN points + ${payout} <= 0 THEN true
              WHEN points + ${payout} > ${SOLVENT_THRESHOLD} THEN false
              ELSE is_bankrupt
            END
        WHERE id = ${wager.userId}
      `);
      graded++;
      if (won) logger.info(`Paid ${payout} pts to user ${wager.userId} for picking correctly`);
    }
    return graded;
  });
}

export async function settleFinishedMatches(): Promise<SettlementResult> {
  const cutoff = new Date(Date.now() - SETTLE_AFTER_MS);
  const candidates = await db
    .select()
    .from(fixturesTable)
    .where(and(eq(fixturesTable.status, "pending"), lt(fixturesTable.startTime, cutoff)))
    .orderBy(asc(fixturesTable.startTime));

  const findResult = createResultFinder();
  const unmatched: string[] = [];
  let settled = 0;

  for (const fixture of candidates) {
    const result = await findResult(fixture);
    if (result === "not_finished") continue;
    if (!result) {
      unmatched.push(`${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.startTime.toISOString().slice(0, 10)})`);
      continue;
    }
    const graded = await settleFixture(fixture, result.homeScore, result.awayScore);
    settled++;
    logger.info(`Match finished: ${fixture.homeTeam} ${result.homeScore}-${result.awayScore} ${fixture.awayTeam} (${graded} picks graded)`);
  }

  const summary = { checked: candidates.length, settled, unmatched };
  logger.info(summary, "Settlement run complete");
  return summary;
}

let inFlight: Promise<SettlementResult> | null = null;
let lastFinishedAt = 0;

/** Run settlement unless one is already running or one finished in the last few minutes. */
export function runSettlement(options: { force?: boolean } = {}): Promise<SettlementResult> {
  if (inFlight) return inFlight;
  if (!options.force && Date.now() - lastFinishedAt < MIN_INTERVAL_MS) {
    return Promise.resolve({ checked: 0, settled: 0, unmatched: [], skipped: true });
  }
  inFlight = settleFinishedMatches()
    .catch((err): SettlementResult => {
      logger.error({ err }, "Settlement run failed");
      return { checked: 0, settled: 0, unmatched: [], failed: true };
    })
    .finally(() => {
      lastFinishedAt = Date.now();
      inFlight = null;
    });
  return inFlight;
}
