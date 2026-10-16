import { refreshFixtures } from "./apiFootball";
import { logger } from "./logger";
import { runSettlement } from "./settlement";

// Settling uses the free ESPN scoreboard, so it can run often.
// Odds refreshes cost Odds API credits, so those stay at boot + once a day.
const SETTLEMENT_EVERY_MS = 2 * 60 * 60 * 1000;

let refreshing = false;

async function runOddsRefresh(): Promise<void> {
  if (refreshing) {
    logger.warn("Fixtures refresh already in progress; skipping this tick");
    return;
  }
  refreshing = true;
  try {
    const result = await refreshFixtures();
    logger.info({ result }, "Fixtures refresh complete");
  } catch (err) {
    logger.error({ err }, "Fixtures refresh failed");
  } finally {
    refreshing = false;
  }
}

// Milliseconds until the next 3:00 AM server time.
function msUntil3AM(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(3, 0, 0, 0);
  if (now.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

/**
 * Background jobs: on boot, refresh odds and settle finished matches. After that,
 * settle every two hours and refresh odds daily at 3:00 AM.
 */
export function startFixturesScheduler(): void {
  logger.info("Running startup odds refresh and settlement");
  void runOddsRefresh();
  void runSettlement({ force: true });

  const settleTimer = setInterval(() => void runSettlement({ force: true }), SETTLEMENT_EVERY_MS);
  settleTimer.unref?.();

  function scheduleDailyRefresh() {
    const msToWait = msUntil3AM();
    logger.info(`Next odds refresh in ${(msToWait / (1000 * 60 * 60)).toFixed(2)} hours (3:00 AM)`);
    const timer = setTimeout(() => {
      void runOddsRefresh();
      scheduleDailyRefresh();
    }, msToWait);
    timer.unref?.();
  }
  scheduleDailyRefresh();
}
