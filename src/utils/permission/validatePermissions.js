import { PERMISSIONS } from "../config/permissions.js";

export const validatePermissions = (inputPermissions) => {
  const cleanedPermissions = {};

  for (const module in inputPermissions) {
    // ❌ invalid module
    if (!PERMISSIONS[module]) continue;

    cleanedPermissions[module] = {};

    for (const action in inputPermissions[module]) {
      // ❌ invalid action
      if (!PERMISSIONS[module].includes(action)) continue;

      cleanedPermissions[module][action] =
        Boolean(inputPermissions[module][action]);
    }
  }

  return cleanedPermissions;
};