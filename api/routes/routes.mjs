import { Router } from "express";
import authRouter from "./auth/index.mjs";
import userRouter from "./user/index.mjs";
import locationRouter from "./location/index.mjs"

const router = Router();

router.use(authRouter);
router.use(userRouter);
router.use(locationRouter)

export default router;
