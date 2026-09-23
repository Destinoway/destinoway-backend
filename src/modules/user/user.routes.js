import express from "express";

import {
  createStaffController,
  getAllUsersController,
  getSingleUserController,
  updateUserController,
  updateUserStatusController,
} from "./user.controller.js";

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";
import { validate } from "../../middleware/validate.middleware.js";

import {
  createStaffValidation,
  updateUserValidation,
} from "./user.validation.js";

const router = express.Router();

/**
 * CREATE STAFF
 * POST /api/v1/users/staff
 */
router.post(
  "/staff",
  protect,
  checkPermission("users", "write"),
  validate(createStaffValidation),
  createStaffController,
);

/**
 * GET USERS
 *
 * Examples:
 * GET /users
 * GET /users?type=staff
 * GET /users?type=customer
 * GET /users?search=aditya
 * GET /users?roleName=manager
 */
router.get(
  "/",
  protect,
  checkPermission("users", "read"),
  getAllUsersController,
);

/**
 * GET SINGLE USER
 */
router.get(
  "/:id",
  protect,
  checkPermission("users", "read"),
  getSingleUserController,
);

/**
 * UPDATE USER
 */
router.put(
  "/:id",
  protect,
  checkPermission("users", "update"),
  validate(updateUserValidation),
  updateUserController,
);

/**
 * UPDATE USER STATUS
 */
router.patch(
  "/:id/status",
  protect,
  checkPermission("users", "update"),
  updateUserStatusController,
);

/**
 * DELETE USER
 */
// router.delete(
//   "/:id",
//   protect,
//   checkPermission("users", "delete"),
//   deleteUserController,
// );

export default router;
