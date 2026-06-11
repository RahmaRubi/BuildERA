import { Router } from "express";
import multer from "multer";
import * as userServices from "./user.service.js";
import * as validationServices from "./user.validation.js";
import { isAuthenticate } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/error/async_handler.js";
import { isValid } from "../../middlewares/validation.middleware.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.use(isAuthenticate);

router.get("/profile",           asyncHandler(userServices.getProfile));
router.put("/profile",           isValid(validationServices.updateProfile), asyncHandler(userServices.updateProfile));
router.delete("/freeze-account", asyncHandler(userServices.freezeAccount));

router.put("/profile/picture",           upload.single('image'), asyncHandler(userServices.uploadProfilePicture));

router.get("/favorites",                 asyncHandler(userServices.getFavorites));
router.post("/favorites/:componentId",   asyncHandler(userServices.addFavorite));
router.delete("/favorites/:componentId", asyncHandler(userServices.removeFavorite));

export default router;
    