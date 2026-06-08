import { Router } from "express";
import * as userServices from "./user.service.js";
import * as validationServices from "./user.validation.js";
import { isAuthenticate } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/error/async_handler.js";
import { isValid } from "../../middlewares/validation.middleware.js";

const router = Router();
router.use(isAuthenticate);

router.get("/profile",           asyncHandler(userServices.getProfile));
router.put("/profile",           isValid(validationServices.updateProfile), asyncHandler(userServices.updateProfile));
router.delete("/freeze-account", asyncHandler(userServices.freezeAccount));

export default router;
