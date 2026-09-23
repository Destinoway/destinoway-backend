import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../../utils/authentication/token.util.js";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";

import { sendEmailOtpService, verifyEmailOtpService } from "./email.service.js";

export const sendEmailOtp = asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();

  if (!email) {
    return sendError(res, "Email is required", 400);
  }

  await sendEmailOtpService(email);

  return sendSuccess(res, "OTP sent successfully");
});

export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const { otp } = req.body;

  if (!email || !otp) {
    return sendError(res, "Email & OTP required", 400);
  }

  const user = await verifyEmailOtpService(email, otp);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;

  // ✅ PROFILE COMPLETION CHECK
  user.profileCompleted = !!(user.name && user.email && user.mobile);

  await user.save();

  return sendSuccess(res, "Login successful", {
    _id: user._id,
    email: user.email || null,
    mobile: user.mobile || null,
    name: user.name || null,
    avatar: user.avatar || null,
    googleId: user.googleId || null,
    providers: user.providers || [],
    isEmailVerified: user.isEmailVerified ?? false,
    isMobileVerified: user.isMobileVerified ?? false,
    accessToken,
    refreshToken,
    profileCompleted: user.profileCompleted,
    profilePopupDismissed: user.profilePopupDismissed,
  });
});
