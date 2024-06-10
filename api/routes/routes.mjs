import { Router } from "express";
import authRouter from "./auth/index.mjs";

const router = Router();

router.use(authRouter);

export default router;
