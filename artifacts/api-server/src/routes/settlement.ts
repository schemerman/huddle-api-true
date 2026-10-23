import { Router, type IRouter } from "express";
import { requireUser } from "../middlewares/auth";
import { runSettlement } from "../lib/settlement";

const router: IRouter = Router();

// The app calls this when someone has picks on matches that should be over.
// It is safe to call often: runs are throttled and a pick can only be paid once.
// Any signed-in user can ask for finished matches to be settled (it only uses real results).
router.post("/settlement/run", requireUser, async (_req, res): Promise<void> => {
  const result = await runSettlement();
  res.json(result);
});

export default router;
