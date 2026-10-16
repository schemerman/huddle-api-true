import { Router, type IRouter } from "express";
import { runSettlement } from "../lib/settlement";

const router: IRouter = Router();

// The app calls this when someone has picks on matches that should be over.
// It is safe to call often: runs are throttled and a pick can only be paid once.
router.post("/settlement/run", async (_req, res): Promise<void> => {
  const result = await runSettlement();
  res.json(result);
});

export default router;
