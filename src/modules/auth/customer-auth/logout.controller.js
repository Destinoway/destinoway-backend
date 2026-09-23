import { asyncHandler } from "../../../middleware/asyncHandler.js";
import {
  sendError,
  sendSuccess,
} from "../../../utils/response/ApiResponse.js";

import User from "../../user/user.model.js";

export const logoutCustomer = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, "Refresh token required", 400);
  }

  // 🔥 FIND USER BY TOKEN
  const user = await User.findOne({ refreshToken });

  if (!user) {
    return sendError(res, "User not found", 404);
  }

  // 🔥 REMOVE TOKEN
  user.refreshToken = null;
  await user.save();

  return sendSuccess(res, "Logout successful");
});