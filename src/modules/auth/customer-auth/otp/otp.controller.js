import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../../utils/authentication/token.util.js";
import { parseMobileNumber } from "../../../../utils/mobileNumber.js";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";

import { findOrCreateAndMergeUser } from "../auth.service.js";
import { sendOTPService, verifyOTPService } from "./otp.service.js";

export const sendOTP = asyncHandler(async (req, res) => {
  const { mobile, mobileCountryCode } = parseMobileNumber(req.body.mobile, req.body.mobileCountryCode);

  if (!mobile) {
    return sendError(res, "Invalid mobile number", 400);
  }

  await sendOTPService(mobile, mobileCountryCode);

  return sendSuccess(res, "OTP sent successfully");
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const { mobile, mobileCountryCode } = parseMobileNumber(req.body.mobile, req.body.mobileCountryCode);
  const otp = String(req.body.otp || "");

  if (!mobile || !otp) {
    return sendError(res, "Invalid mobile or OTP", 400);
  }

  await verifyOTPService(mobile, otp, mobileCountryCode);

  const user = await findOrCreateAndMergeUser({
    mobile,
    mobileCountryCode,
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
    mobileCountryCode: user.mobileCountryCode || "+91",
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
