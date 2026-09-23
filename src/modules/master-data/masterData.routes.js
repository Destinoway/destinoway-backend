import express from "express";
import {
  createMasterData,
  getMasterData,
  updateMasterData,
  deleteMasterData,
} from "./masterData.controller.js";

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";

const router = express.Router();

// WEBSITE
router.get("/", getMasterData);

// ADMIN
router.post(
  "/create",
  protect,
  checkPermission("masterData", "write"),
  createMasterData
);

router.get(
  "/admin",
  protect,
  checkPermission("masterData", "read"),
  getMasterData
);

router.put(
  "/:id",
  protect,
  checkPermission("masterData", "update"),
  updateMasterData
);

router.delete(
  "/:id",
  protect,
  checkPermission("masterData", "delete"),
  deleteMasterData
);

export default router;