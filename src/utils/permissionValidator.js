import { PERMISSIONS } from "../config/permissions.js";
import ApiError from "./response/ApiError.js";

export const validatePermissions = (permissions = {}) => {
  for (const module in permissions) {
    if (!PERMISSIONS[module]) {
      throw new ApiError(400, `Invalid module: ${module}`);
    }

    for (const action in permissions[module]) {
      if (!PERMISSIONS[module].includes(action)) {
        throw new ApiError(
          400,
          `Invalid action "${action}" in module "${module}"`,
        );
      }

      // ❌ invalid value
      if (typeof permissions[module][action] !== "boolean") {
        throw new ApiError(
          400,
          `Permission value must be boolean (${module}.${action})`,
        );
      }
    }
  }
};
