import app from "./app";
import { logger } from "./lib/logger";
import { startFixturesScheduler } from "./lib/scheduler";
import { refreshFixtures } from "./lib/apiFootball";
import { settleFinishedMatches } from "./lib/settlement";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  
  // 1. Start the background repeating schedulers
  startFixturesScheduler();
  
  // 2. Force an immediate refresh of matches
  refreshFixtures()
    .then((result) => logger.info({ result }, "Initial manual refresh complete"))
    .catch((err) => logger.error({ err }, "Initial manual refresh failed"));

  // 3. Force an immediate check for finished games
  settleFinishedMatches()
    .then((result) => logger.info({ result }, "Initial settlement check complete"))
    .catch((err) => logger.error({ err }, "Initial settlement check failed"));
});