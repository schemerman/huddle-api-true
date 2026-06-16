import { refreshFixtures } from "./apiFootball";
import { logger } from "./logger";
import { settleFinishedMatches } from "./settlement";

// Changed to 2 hours to keep users happy without blowing up API limits
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

let running = false;

async function runRefresh(): Promise<void> {
  if (running) {
    logger.warn("Fixtures refresh already in progress; skipping this tick");
    return;
  }
  running = true;
  try {
    // 1. Fetch the latest scores/odds
    await refreshFixtures();
    // 2. Immediately pay out any games that just finished
    await settleFinishedMatches();
  } catch (err) {
    logger.error({ err }, "Fixtures refresh or settlement failed");
  } finally {
    running = false;
  }
}

/**
 * Start the background fixtures refresh: run once on boot to warm the cache,
 * then every 2 hours. The interval is unref'd so it never keeps the process
 * alive on its own.
 */
export function startFixturesScheduler(): void {
  void runRefresh();
  const timer = setInterval(() => void runRefresh(), TWO_HOURS_MS);
  timer.unref?.();
  logger.info({ intervalHours: 2 }, "Fixtures scheduler started");
}