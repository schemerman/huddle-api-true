import { refreshFixtures } from "./apiFootball";
import { logger } from "./logger";
import { settleFinishedMatches } from "./settlement";

let running = false;

async function runRefresh(): Promise<void> {
  if (running) {
    logger.warn("Fixtures refresh already in progress; skipping this tick");
    return;
  }
  running = true;
  try {
    // 1. Fetch the latest scores/odds using your fresh API key
    await refreshFixtures();
    // 2. Immediately pay out any games that just finished
    await settleFinishedMatches();
  } catch (err) {
    logger.error({ err }, "Fixtures refresh or settlement failed");
  } finally {
    running = false;
  }
}

// Calculates exactly how many milliseconds are left until the next 3:00 AM
function msUntil3AM(): number {
  const now = new Date();
  const target = new Date();
  
  // Set the target time to exactly 3:00:00 AM local server time
  target.setHours(3, 0, 0, 0); 
  
  // If it is already past 3:00 AM today, push the target to tomorrow
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  
  return target.getTime() - now.getTime();
}

/**
 * Start the background fixtures refresh: 
 * Runs instantly on boot to clear pending wagers, then sleeps until 3:00 AM daily.
 */
export function startFixturesScheduler(): void {
  // --- THE INSTANT CATCH-UP ---
  logger.info("Running instant startup settlement to clear pending wagers...");
  void runRefresh();

  // --- THE DAILY OVERNIGHT SCHEDULE ---
  function scheduleDailyRun() {
    const msToWait = msUntil3AM();
    
    // Log the wait time so you can see it working in your terminal
    const hoursToWait = (msToWait / (1000 * 60 * 60)).toFixed(2);
    logger.info(`Next automated payout scheduled in ${hoursToWait} hours (at 3:00 AM).`);

    const timer = setTimeout(() => {
      void runRefresh();
      scheduleDailyRun(); // Re-schedule for the following night
    }, msToWait);
    
    timer.unref?.();
  }

  // Start the daily loop
  scheduleDailyRun();
}