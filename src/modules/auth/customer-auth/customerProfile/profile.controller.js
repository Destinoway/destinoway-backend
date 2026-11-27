import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";

import {
  getProfileService,
  serializeCustomerProfile,
  updateProfileService,
} from "./profile.service.js";

import { parseMobileNumber } from "../../../../utils/mobileNumber.js";
import { verifyOTPService } from "../otp/otp.service.js";
import User from "../../../user/user.model.js";
import { verifyOtp } from "../shared/otp/otp.core.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getProfileService(req.user._id);
  return sendSuccess(res, "Profile fetched", serializeCustomerProfile(user));
});

export const updateProfile = asyncHandler(async (req, res) => {

  const user = await updateProfileService(req.user._id, req.body);

  return sendSuccess(res, "Profile updated", serializeCustomerProfile(user));
});

export const verifyProfileEmail = asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const { otp } = req.body;

  if (!email || !otp) {
    return sendError(res, "Email & OTP required", 400);
  }

  await verifyOtp("email", email, otp);

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, "User not found", 404);

  if (user.email === email) {
    return sendSuccess(res, "Email already linked", serializeCustomerProfile(user));
  }

  const existing = await User.findOne({ email });

  if (existing && !existing._id.equals(user._id)) {
    return sendError(res, "Email already used by another account", 400);
  }

  user.email = email;
  user.isEmailVerified = true;

  if (!user.providers.includes("email")) {
    user.providers.push("email");
  }

  user.profileCompleted = !!(user.name && (user.email || user.mobile));

  await user.save();

  return sendSuccess(res, "Email linked successfully", {
    _id: user._id,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    profileCompleted: user.profileCompleted,
  });
});

export const verifyProfileMobile = asyncHandler(async (req, res) => {
  const { mobile, mobileCountryCode } = parseMobileNumber(req.body.mobile, req.body.mobileCountryCode);
  const { otp } = req.body;

  if (!mobile || !otp) {
    return sendError(res, "Mobile & OTP required", 400);
  }

  await verifyOTPService(mobile, otp, mobileCountryCode);

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, "User not found", 404);

  if (user.mobile === mobile && (user.mobileCountryCode || "+91") === mobileCountryCode && user.isMobileVerified) {
    return sendSuccess(res, "Mobile already linked", serializeCustomerProfile(user));
  }

  const existing = await User.findOne({ mobile });

  if (existing && !existing._id.equals(user._id)) {
    return sendError(res, "Mobile already used by another account", 400);
  }

  user.mobile = mobile;
  user.mobileCountryCode = mobileCountryCode;
  user.isMobileVerified = true;

  if (!user.providers.includes("otp")) {
    user.providers.push("otp");
  }

  user.profileCompleted = !!(user.name && (user.email || user.mobile));

  await user.save();

  return sendSuccess(res, "Mobile linked successfully", {
    _id: user._id,
    mobile: user.mobile,
    mobileCountryCode: user.mobileCountryCode,
    isMobileVerified: user.isMobileVerified,
    profileCompleted: user.profileCompleted,
  });
});
