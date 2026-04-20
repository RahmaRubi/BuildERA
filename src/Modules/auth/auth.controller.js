import { Router } from "express";
import * as authServices from "./auth.service.js";
import * as validationServices from './auth.validation.js'
import { asyncHandler } from "../../utils/error/async_handler.js";
import { isValid } from "../../middlewares/validation.middleware.js";
const router = Router();

router.post("/register", isValid(validationServices.register), asyncHandler(authServices.register));
router.post("/login", isValid(validationServices.login), asyncHandler(authServices.login));
router.get("/activate-account/:token", asyncHandler(authServices.activateAccount),
);

export default router;
