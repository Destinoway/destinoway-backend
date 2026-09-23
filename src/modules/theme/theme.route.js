import express from "express";

import {
  
  getThemeController,
  updateThemeController,
} from "./theme.controller.js";

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";

const router = express.Router();

router.get("/", getThemeController);

router.put(
  "/update",
  protect,
  checkPermission("theme", "update"),
  updateThemeController,
);



export default router;
