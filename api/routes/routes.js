import { Router } from "express";
import authRouter from "./auth/index.js";
import userRouter from "./user/user.js";
import locationRouter from "./location/location.js"

const router = Router();

router.use(authRouter);
router.use(userRouter);
router.use(locationRouter)

export default router;
