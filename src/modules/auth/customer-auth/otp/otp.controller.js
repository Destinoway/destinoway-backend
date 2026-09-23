import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../../utils/authentication/token.util.js";
import { normalizeMobile } from "../../../../utils/normalizeMobile.js";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";

import { findOrCreateAndMergeUser } from "../auth.service.js";
import { sendOTPService, verifyOTPService } from "./otp.service.js";

export const sendOTP = asyncHandler(async (req, res) => {
  const mobile = normalizeMobile(req.body.mobile);

  if (!mobile || mobile.length !== 10) {
    return sendError(res, "Invalid mobile number", 400);
  }

  await sendOTPService(mobile);

  return sendSuccess(res, "OTP sent successfully");
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const mobile = normalizeMobile(req.body.mobile);
  const otp = String(req.body.otp || "");

  console.log("🔍 VERIFY LOGIN INPUT:", mobile, otp);

  if (!mobile || mobile.length !== 10 || !otp) {
    return sendError(res, "Invalid mobile or OTP", 400);
  }

  await verifyOTPService(mobile, otp);

  const user = await findOrCreateAndMergeUser({
    mobile,
    provider: "otp",
  });

  if (!user.isActive) {
    return sendError(res, "Account is deactivated", 403);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;

  // ✅ PROFILE COMPLETION CHECK
  user.profileCompleted = !!(user.name && user.email && user.mobile);

  await user.save();

  return sendSuccess(res, "Login successful", {
    _id: user._id,
    mobile: user.mobile,
    email: user.email || null,
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
