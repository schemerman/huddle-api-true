import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import fixturesRouter from "./fixtures";
import postsRouter from "./posts";
import leaderboardRouter from "./leaderboard";
import leaguesRouter from "./leagues";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(fixturesRouter);
router.use(postsRouter);
router.use(leaderboardRouter);
router.use(leaguesRouter);

export default router;