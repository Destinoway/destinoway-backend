import { asyncHandler } from "../../../../middleware/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../../utils/authentication/token.util.js";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";

import { findOrCreateAndMergeUser } from "../auth.service.js";

export const googleLogin = asyncHandler(async (req, res) => {
  try {
    const { email, name, image, googleId } = req.body;

    console.log("🔥 GOOGLE LOGIN HIT:", { email, googleId });

    if (!email) {
      return sendError(res, "Email is required", 400);
    }

    let user;

    try {
      user = await findOrCreateAndMergeUser({
        email,
        name,
        avatar: image,
        googleId,
        provider: "google",
      });
    } catch (err) {
      if (err.code === 11000 || err.message.includes("duplicate")) {
        console.log("⚠️ Duplicate detected, fetching existing user");

        user = await User.findOne({
          $or: [{ email }, { googleId }],
        });
      } else {
        throw err;
      }
    }

    if (!user) {
      return sendError(res, "User creation failed", 500);
    }

    if (!user.isActive) {
      return sendError(res, "Account is deactivated", 403);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    console.log("✅ GOOGLE LOGIN SUCCESS:", user._id);

    return sendSuccess(res, "Google login successful", {
      _id: user._id,
      email: user.email,
      name: user.name,
      mobile: user.mobile || null,
      avatar: user.avatar || null,
      type: user.type,
      accessToken,
      refreshToken,

      // ✅ FIXED
      profileCompleted: user.profileCompleted,

      profilePopupDismissed: user.profilePopupDismissed,
    });
  } catch (err) {
    console.log("❌ GOOGLE LOGIN ERROR:", err.message);

    return sendError(res, "Google login failed", 500);
  }
});
