import { Router } from "express";
import authRouter from "./auth/auth.js";
import ngoRouter from "./user/ngo.js";
import volunteer from "./user/volunteer.js"
import donor from "./user/donor.js"

const router = Router();

router.use(authRouter);
router.use(ngoRouter);
router.use(volunteer);
router.use(donor);

export default router;
