import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import hubsRouter from "./hubs";
import challengesRouter from "./challenges";
import companionRouter from "./companion";
import votingRouter from "./voting";
import usersRouter from "./users";
import looksRouter from "./looks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(hubsRouter);
router.use(challengesRouter);
router.use(companionRouter);
router.use(votingRouter);
router.use(usersRouter);
router.use(looksRouter);

export default router;
