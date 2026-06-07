import { Router } from "express";
import * as userServices from "./user.service.js";
import { isAuthenticate } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/error/async_handler.js";

const router = Router();
router.use(isAuthenticate)

router.get("/profile", asyncHandler(userServices.getProfile));
router.delete("/freeze-account", asyncHandler(userServices.freezeAccount))

export default router;
