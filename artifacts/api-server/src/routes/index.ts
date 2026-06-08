import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import fixturesRouter from "./fixtures";
import postsRouter from "./posts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(fixturesRouter);
router.use(postsRouter);

export default router;
