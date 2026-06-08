import { Router } from "express";
import * as userServices from "./user.service.js";
import { isAuthenticate } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/error/async_handler.js";
import { isValid } from "../../middlewares/validation.middleware.js";
import joi from 'joi';

const router = Router();
router.use(isAuthenticate);

const updateProfileSchema = joi.object({
    userName: joi.string().min(3).max(22),
    phone:    joi.string(),
}).min(1).required();

router.get("/profile",        asyncHandler(userServices.getProfile));
router.put("/profile",        isValid(updateProfileSchema), asyncHandler(userServices.updateProfile));
router.delete("/freeze-account", asyncHandler(userServices.freezeAccount));

export default router;
