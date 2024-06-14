import { Router } from "express";
import authRouter from "./auth/index.mjs";
import userRouter from "./user/index.mjs";

const router = Router();

router.use(authRouter);
router.use(userRouter);

export default router;
