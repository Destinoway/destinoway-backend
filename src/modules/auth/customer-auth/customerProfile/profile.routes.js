import express from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";

import {
  getProfile,
  updateProfile,
  verifyProfileEmail,
  verifyProfileMobile,
} from "./profile.controller.js";

const router = express.Router();

router.get("/", protectCustomer, getProfile);
router.patch("/", protectCustomer, updateProfile);

router.post("/email/verify", protectCustomer, verifyProfileEmail);
router.post("/mobile/verify", protectCustomer, verifyProfileMobile);

export default router;