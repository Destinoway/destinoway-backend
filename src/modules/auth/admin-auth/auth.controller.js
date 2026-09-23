import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  verifyEmailService,
} from "./auth.service.js";

import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};
export const login = asyncHandler(async (req, res) => {
  const data = await loginUser(req.body);

  res.cookie("accessToken", data.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", data.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  console.log("Response Headers:", res.getHeaders());

  sendSuccess(res, "Login successful", {
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      mobile: data.user.mobile,

      role: data.user.role, // ✅ role name
      type: data.user.type, // 🔥 ADD THIS
      permissions: data.user.permissions || {}, // ✅ always from role
    },
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    const error = new Error("Refresh token missing");
    error.statusCode = 401;
    throw error;
  }

  const { accessToken, refreshToken } = await refreshAccessToken(token);

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendSuccess(res, "Access token refreshed", {});
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, "Profile fetched", {
    user: req.user, // ✅ direct return
  });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.headers["x-refresh-token"];

  if (!req.user?.id || !token) {
    throw new Error("User ID and token are required");
  }

  await logoutUser(req.user.id, token);

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");

  sendSuccess(res, "Logged out successfully");
});
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  await verifyEmailService(token);

  sendSuccess(res, "Email verified successfully");
});
