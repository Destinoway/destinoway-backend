import express from "express";
import {
  createRole,
  getRoleById,
  getRoles,
  getRolesDropdown,
  updateRole,
  updateRoleStatusController,
  deleteRoleController
} from "./role.controller.js";

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";

const router = express.Router();

// Create a new role
router.post("/", protect, checkPermission("roles", "write"), createRole);

// Get all roles
router.get("/", protect, checkPermission("roles", "read"), getRoles);

router.get("/dropdown", protect, getRolesDropdown);

// Get single role by ID
router.get("/:id", protect, checkPermission("roles", "read"), getRoleById);

// Update role by ID
router.put("/:id", protect, checkPermission("roles", "update"), updateRole);

router.patch(
  "/:id/status",
  protect,
  checkPermission("roles", "update"),
  updateRoleStatusController,
);
router.delete(
  "/:id",
  protect,
  checkPermission("roles", "delete"),
  deleteRoleController
);
export default router;
