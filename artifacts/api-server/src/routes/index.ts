import { Router, type IRouter } from "express";
import healthRouter from "./health";
import placesRouter from "./places";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/places", placesRouter);

export default router;
