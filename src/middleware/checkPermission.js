import User from "../modules/user/user.model.js";
import { hasPermission } from "../utils/permission/permission.util.js";
import { sendError } from "../utils/response/ApiResponse.js";

const actionMap = {
  read: "view",
  write: "create",
  update: "update",
  delete: "delete",
};

export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id)
        .select("-password")
        .populate({
          path: "role",
          select: "name permissions isActive",
        });

      if (!user) {
        return sendError(res, "Unauthorized", 401);
      }

      console.log("USER:", user);
      console.log("ROLE PERMISSIONS:", user.role?.permissions);

      // ✅ user active
      if (!user.isActive) {
        return sendError(res, "Account is inactive", 403);
      }

      // ✅ role active
      if (!user.role?.isActive) {
        return sendError(res, "Role is inactive", 403);
      }

      // ✅ admin bypass
      if (user.role?.name === "admin" || user.isSystemRole) {
        return next();
      }

      if (!hasPermission(user.role?.permissions, module, action)) {
        const actionText = actionMap[action] || action;

        return sendError(
          res,
          `You don’t have permission to ${actionText} ${module}`,
          403,
        );
      }

      next();
    } catch (error) {
      console.error(error);
      return sendError(res, "Server error", 500);
    }
  };
};
