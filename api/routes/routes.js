import { Router } from "express";
import authRouter from "./auth/auth.js";
import userRouter from "./user/user.js";
import ngoRouter from "./user/ngo.js";
import volunteer from "./user/volunteer.js"

const router = Router();

router.use(authRouter);
router.use(userRouter);
router.use(ngoRouter);
router.use(volunteer);

export default router;
