import { refreshFixtures } from "./apiFootball";
import { logger } from "./logger";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

let running = false;

async function runRefresh(): Promise<void> {
  if (running) {
    logger.warn("Fixtures refresh already in progress; skipping this tick");
    return;
  }
  running = true;
  try {
    await refreshFixtures();
  } catch (err) {
    logger.error({ err }, "Fixtures refresh failed");
  } finally {
    running = false;
  }
}

/**
 * Start the background fixtures refresh: run once on boot to warm the cache,
 * then every 12 hours. The interval is unref'd so it never keeps the process
 * alive on its own.
 */
export function startFixturesScheduler(): void {
  void runRefresh();
  const timer = setInterval(() => void runRefresh(), TWELVE_HOURS_MS);
  timer.unref?.();
  logger.info({ intervalHours: 12 }, "Fixtures scheduler started");
}
