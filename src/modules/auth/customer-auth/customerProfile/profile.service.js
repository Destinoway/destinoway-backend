import User from "../../../user/user.model.js";
import { parseMobileNumber } from "../../../../utils/mobileNumber.js";

const CUSTOMER_PROFILE_UPDATE_FIELDS = new Set([
  "name",
  "nationality",
  "maritalStatus",
  "anniversary",
  "dateOfBirth",
  "city",
  "state",
  "gender",
  "email",
  "mobile",
  "mobileCountryCode",
  "avatar",
  "profilePopupDismissed",
]);

const CUSTOMER_PROFILE_PRIVATE_FIELDS = [
  "password",
  "refreshToken",
  "role",
  "type",
  "providers",
  "googleId",
  "isActive",
];

export const serializeCustomerProfile = (user) => {
  if (!user) return user;

  const profile =
    typeof user.toObject === "function" ? user.toObject() : { ...user };
  for (const field of CUSTOMER_PROFILE_PRIVATE_FIELDS) {
    delete profile[field];
  }
  return profile;
};

export const getProfileService = async (userId) => {
  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  return user;
};
export const updateProfileService = async (userId, payload) => {
  payload = Object.fromEntries(
    Object.entries(payload).filter(([field]) =>
      CUSTOMER_PROFILE_UPDATE_FIELDS.has(field),
    ),
  );

  // Only the OTP verification endpoint may mark a mobile number verified.
  delete payload.isMobileVerified;
  delete payload.isEmailVerified;

  const existing = await User.findById(userId);
  if (!existing) throw new Error("User not found");

  if (payload.email !== undefined) {
    payload.email = payload.email.toLowerCase().trim();
    if (payload.email !== existing.email) {
      payload.isEmailVerified = false;
    } else {
      delete payload.email;
    }
  }

  if (payload.mobile !== undefined || payload.mobileCountryCode !== undefined) {
    const phone = parseMobileNumber(
      payload.mobile ?? existing.mobile,
      payload.mobileCountryCode ?? existing.mobileCountryCode ?? "+91",
    );
    if (
      existing.mobile !== phone.mobile ||
      (existing.mobileCountryCode || "+91") !== phone.mobileCountryCode
    ) {
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
