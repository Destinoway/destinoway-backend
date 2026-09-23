import express from "express";
import { protect } from "../../../middleware/auth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import {
  getMe,
  login,
  logout,
  refreshToken,
  verifyEmail,
} from "./auth.controller.js";
import { loginValidation } from "./auth.validation.js";

const router = express.Router();

router.post("/login", validate(loginValidation), login);

router.post("/refresh-token", refreshToken);
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.get("/verify-email", verifyEmail);

export default router;
