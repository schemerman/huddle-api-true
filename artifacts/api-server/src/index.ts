import app from "./app";
import { logger } from "./lib/logger";
import { startFixturesScheduler } from "./lib/scheduler";

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

  // Refreshes odds and settles finished matches on boot, then on a schedule.
  startFixturesScheduler();
});
