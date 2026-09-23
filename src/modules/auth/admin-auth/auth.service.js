import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../../../utils/response/ApiError.js";
import User from "../../user/user.model.js";

import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../utils/authentication/token.util.js";

import {
  deleteRefreshToken,
  deleteVerifyToken,
  isRefreshTokenValid,
  isVerifyTokenValid,
  saveRefreshToken,
} from "../../../utils/cache/authCache.js";

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, "Email & password required");
  }

  const user = await User.findOne({ email }).select("+password").populate({
    path: "role",
    select: "name permissions type isActive", // ✅ FIX
  });

  if (!user) throw new ApiError(401, "Invalid credentials");

  // 🔥 USER ACTIVE CHECK
  if (!user.isActive) {
    throw new ApiError(403, "Your account is deactivated");
  }

  // 🔥 ROLE ACTIVE CHECK
  if (!user.role?.isActive) {
    throw new ApiError(403, "Your role is inactive");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await saveRefreshToken(user._id, refreshToken);

  return {
    accessToken,
    refreshToken,

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,

      role: user.role?.name || null, //
      type: user.role?.type || null,
      permissions: user.role?.permissions || {},
    },
  };
};
export const refreshAccessToken = async (token) => {
  if (!token) throw new ApiError(401, "Refresh token missing");

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const isValid = await isRefreshTokenValid(decoded.id, token);

  if (!isValid) {
    throw new ApiError(401, "Invalid refresh token");
  }

  await deleteRefreshToken(decoded.id, token);

  const newAccessToken = generateAccessToken(decoded);
  const newRefreshToken = generateRefreshToken(decoded);

  await saveRefreshToken(decoded.id, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutUser = async (userId, token) => {
  if (!userId || !token) {
    throw new ApiError(400, "User ID and token are required");
  }

  await deleteRefreshToken(userId, token);

  return true;
};

export const verifyEmailService = async (token) => {
  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(400, "Invalid or expired token");
  }

  const isValid = await isVerifyTokenValid(decoded.id, token);

  if (!isValid) {
    throw new ApiError(400, "Token already used or invalid");
  }

  const user = await User.findById(decoded.id);

  if (!user) throw new ApiError(404, "User not found");

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  user.isEmailVerified = true;
  await user.save();

  await deleteVerifyToken(decoded.id, token);

  return true;
};
