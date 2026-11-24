import User from "../../user/user.model.js";
import { assertMobileCountryMatches, normalizeMobileCountryCode } from "../../../utils/mobileNumber.js";

export const findOrCreateAndMergeUser = async ({
  email,
  mobile,
  mobileCountryCode = "+91",
  name,
  avatar,
  googleId,
  provider,
}) => {
  try {

    if (email) email = email.toLowerCase().trim();
    if (mobile) mobile = mobile.trim();

    let userByGoogle = null;
    let userByEmail = null;
    let userByMobile = null;

    if (googleId) userByGoogle = await User.findOne({ googleId });
    if (email) userByEmail = await User.findOne({ email });
    if (mobile) userByMobile = await User.findOne({ mobile });

    if (provider === "google") {
      if (userByGoogle) return userByGoogle;

      if (userByEmail) {

        userByEmail.googleId = googleId;
        userByEmail.avatar = userByEmail.avatar || avatar;
        userByEmail.name = userByEmail.name || name;
        userByEmail.isEmailVerified = true;

        if (!userByEmail.providers.includes("google")) {
          userByEmail.providers.push("google");
        }

        await userByEmail.save();
        return userByEmail;
      }

      // 🔥 NEW USER
      return await User.create({
        email,
        name: name || "",
        avatar: avatar || null,
        googleId,
        providers: ["google"],
        type: "customer",
        isEmailVerified: true,
        isActive: true,
      });
    }

    if (provider === "otp") {
      mobileCountryCode = normalizeMobileCountryCode(mobileCountryCode);
      assertMobileCountryMatches(userByMobile, mobileCountryCode);
      if (userByMobile) {

        userByMobile.isMobileVerified = true;
        userByMobile.mobileCountryCode = mobileCountryCode;

        if (!userByMobile.providers.includes("otp")) {
          userByMobile.providers.push("otp");
        }

        await userByMobile.save();
        return userByMobile;
      }

      // 🔥 NEW USER
      return await User.create({
        mobile,
        mobileCountryCode,
        providers: ["otp"],
        type: "customer",
        isMobileVerified: true,
        isActive: true,
      });
    }

    if (provider === "email") {
      if (userByEmail) {

        userByEmail.isEmailVerified = true;

        if (!userByEmail.providers.includes("email")) {
          userByEmail.providers.push("email");
        }

        await userByEmail.save();
        return userByEmail;
      }

      return await User.create({
        email,
        providers: ["email"],
        type: "customer",
        isEmailVerified: true,
        isActive: true,
      });
    }

    throw new Error("Invalid auth provider");
  } catch (err) {
    throw err;
  }
};
