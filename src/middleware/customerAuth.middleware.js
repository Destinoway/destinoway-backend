import jwt from "jsonwebtoken";
import User from "../modules/user/user.model.js";

export const protectCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("🧠 DECODED:", decoded);
      console.log("⏱ EXP:", decoded.exp * 1000);
      console.log("🕒 NOW:", Date.now());
    } catch (err) {
      console.log("❌ JWT VERIFY ERROR:", err.message);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated",
      });
    }

    req.user = user;

    next();
  } catch (err) {
    console.log("❌ AUTH MIDDLEWARE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Auth middleware failed",
    });
  }
};
