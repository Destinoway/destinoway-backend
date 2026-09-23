import jwt from "jsonwebtoken";
import User from "../modules/user/user.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password").populate({
      path: "role",
      select: "name permissions type isActive",
    });

    console.log("user-data:", user.isActive, user.role?.isActive);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (!user.role?.isActive) {
      return res.status(403).json({
        success: false,
        message: "Role is inactive",
      });
    }
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      

      role: user.role?.name,
      type: user.role?.type,

      permissions: user.role?.permissions || {},
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
