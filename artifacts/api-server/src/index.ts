import app from "./app";
import { logger } from "./lib/logger";
import { startFixturesScheduler } from "./lib/scheduler";
import { refreshFixtures } from "./lib/apiFootball";
import { settleFinishedMatches } from "./lib/settlement";

// Safely grab the Render port, or fallback to 8080 so it NEVER crashes
const port = Number(process.env.PORT) || 8080;

// Modern object binding: { port, host }. 
// This is strictly required by modern frameworks to securely open to the public internet.
app.listen({ port: port, host: "0.0.0.0" }, (err: any) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server successfully bound to 0.0.0.0 and listening!");
  
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