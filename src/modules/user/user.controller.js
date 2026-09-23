import {
  createStaff,
  getAllUsers,
  getSingleUser,
  updateUser,
  updateUserStatus,
} from "./user.service.js";

import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendSuccess } from "../../utils/response/ApiResponse.js";

export const createStaffController = asyncHandler(async (req, res) => {
  const user = await createStaff(req.body);
  return sendSuccess(res, "Staff created successfully", user, null, 201);
});

export const getAllUsersController = asyncHandler(async (req, res) => {
  const result = await getAllUsers(req.query);

  return sendSuccess(
    res,
    "Users fetched successfully",
    result.data,
    result.pagination,
  );
});

export const getSingleUserController = asyncHandler(async (req, res) => {
  const user = await getSingleUser(req.params.id);

  return sendSuccess(res, "User fetched successfully", user);
});

export const updateUserController = asyncHandler(async (req, res) => {
  const user = await updateUser(req.params.id, req.body);

  return sendSuccess(res, "User updated successfully", user);
});

export const getProfileController = asyncHandler(async (req, res) => {
  return sendSuccess(res, "Profile fetched", req.user);
});

export const updateProfileController = asyncHandler(async (req, res) => {
  const user = await updateUser(req.user._id, req.body);

  return sendSuccess(res, "Profile updated successfully", user);
});

export const updateUserStatusController = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be boolean");
  }
  const user = await updateUserStatus(req.params.id, isActive);
  return sendSuccess(res, "User status updated", user);
});
