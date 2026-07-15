import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import hubsRouter from "./hubs";
import challengesRouter from "./challenges";
import companionRouter from "./companion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(hubsRouter);
router.use(challengesRouter);
router.use(companionRouter);

export default router;
