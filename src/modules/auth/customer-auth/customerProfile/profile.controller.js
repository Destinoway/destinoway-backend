import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";

import { getProfileService, updateProfileService } from "./profile.service.js";

import { normalizeMobile } from "../../../../utils/normalizeMobile.js";
import User from "../../../user/user.model.js";
import { verifyOtp } from "../shared/otp/otp.core.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getProfileService(req.user._id);
  return sendSuccess(res, "Profile fetched", user);
});

export const updateProfile = asyncHandler(async (req, res) => {

  const user = await updateProfileService(req.user._id, req.body);

  return sendSuccess(res, "Profile updated", user);
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
    return sendSuccess(res, "Email already linked", user);
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
  const mobile = normalizeMobile(req.body.mobile);
  const { otp } = req.body;

  if (!mobile || !otp) {
    return sendError(res, "Mobile & OTP required", 400);
  }

  await verifyOtp("mobile", mobile, otp);

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, "User not found", 404);

  if (user.mobile === mobile) {
    return sendSuccess(res, "Mobile already linked", user);
  }

  const existing = await User.findOne({ mobile });

  if (existing && !existing._id.equals(user._id)) {
    return sendError(res, "Mobile already used by another account", 400);
  }

  user.mobile = mobile;
  user.isMobileVerified = true;

  if (!user.providers.includes("otp")) {
    user.providers.push("otp");
  }

  user.profileCompleted = !!(user.name && (user.email || user.mobile));

  await user.save();

  return sendSuccess(res, "Mobile linked successfully", {
    _id: user._id,
    mobile: user.mobile,
    isMobileVerified: user.isMobileVerified,
    profileCompleted: user.profileCompleted,
  });
});
