import User from "../../../user/user.model.js";
import { parseMobileNumber } from "../../../../utils/mobileNumber.js";

export const getProfileService = async (userId) => {
  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  return user;
};
export const updateProfileService = async (userId, payload) => {
  payload = { ...payload };
  // Only the OTP verification endpoint may mark a mobile number verified.
  delete payload.isMobileVerified;
  if (payload.mobile !== undefined || payload.mobileCountryCode !== undefined) {
    const existing = await User.findById(userId);
    if (!existing) throw new Error("User not found");
    const phone = parseMobileNumber(payload.mobile ?? existing.mobile, payload.mobileCountryCode ?? existing.mobileCountryCode ?? "+91");
    if (existing.mobile !== phone.mobile || (existing.mobileCountryCode || "+91") !== phone.mobileCountryCode) {
      payload.isMobileVerified = false;
    }
    Object.assign(payload, phone);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: payload },   // 🔥 MAGIC LINE
    { new: true, runValidators: true }
  );

  if (!user) throw new Error("User not found");

  // profile completion logic
  user.profileCompleted = !!(user.name && (user.email || user.mobile));
  await user.save();

  return user;
};
