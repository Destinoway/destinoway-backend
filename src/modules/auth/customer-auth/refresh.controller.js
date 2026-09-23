import jwt from "jsonwebtoken";
import { generateAccessToken } from "../../../utils/authentication/token.util.js";
import User from "../../user/user.model.js";

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    console.log("🧠 DECODED:", decoded);

    const userId = decoded.id || decoded.userId || decoded._id;

    const user = await User.findById(userId);

    console.log("REQUEST REFRESH TOKEN:", refreshToken);
    console.log("DB REFRESH TOKEN:", user?.refreshToken);
    console.log("TOKEN MATCH:", user?.refreshToken === refreshToken);

    // 🔥 MOST IMPORTANT FIX
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      console.log("❌ INVALID REFRESH TOKEN:", userId);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = generateAccessToken(user);

    console.log("✅ NEW ACCESS TOKEN GENERATED");

    return res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.log("❌ REFRESH ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Refresh failed",
    });
  }
};
