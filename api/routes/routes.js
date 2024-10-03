import { Router } from "express";
import authRouter from "./auth/auth.js";
import userRouter from "./user/user.js";

const router = Router();

router.use(authRouter);
router.use(userRouter);

export default router;
