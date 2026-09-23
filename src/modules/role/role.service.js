import { validatePermissions } from "../../utils/permissionValidator.js";
import ApiError from "../../utils/response/ApiError.js";
import Role from "./role.model.js";
import User from "../user/user.model.js";
import { queryBuilder } from "../../utils/queryBuilder.js";

//////////////////////////////////////////////////////////////
// 🔹 Create Role
//////////////////////////////////////////////////////////////
export const createRoleService = async ({
  name,
  description,
  permissions,
  type, // ✅ ADD THIS
}) => {
  if (!name) throw new ApiError(400, "Role name is required");
  if (!type) throw new ApiError(400, "Role type is required");

  // ✅ validate type
  if (!["admin", "staff", "customer"].includes(type)) {
    throw new ApiError(400, "Invalid role type");
  }

  name = name.toLowerCase().trim();

  const existing = await Role.findOne({ name });
  if (existing) throw new ApiError(400, "Role already exists");

  validatePermissions(permissions);

  return await Role.create({
    name,
    description,
    permissions,
    type, // ✅ SAVE TYPE
  });
};

//////////////////////////////////////////////////////////////
// 🔹 Get All Roles
//////////////////////////////////////////////////////////////
export const getRolesService = async () => {
  return await Role.find({
    type: { $ne: "admin" },
  })
    .select("-type")
    .sort({ createdAt: -1 });
};
//////////////////////////////////////////////////////////////
// 🔹 Get Role By ID
//////////////////////////////////////////////////////////////
export const getRoleByIdService = async (id) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new ApiError(404, "Role not found");
  }
  return role;
};

//////////////////////////////////////////////////////////////
// 🔹 Update Role
//////////////////////////////////////////////////////////////
export const updateRoleService = async (id, data) => {
  const role = await Role.findById(id);
  if (!role) throw new ApiError(404, "Role not found");

  if (role.isSystemRole) {
    throw new ApiError(400, "System role cannot be modified");
  }

  // ✅ update type (optional)
  if (data.type) {
    if (!["admin", "staff", "customer"].includes(data.type)) {
      throw new ApiError(400, "Invalid role type");
    }
    role.type = data.type;
  }

  if (data.permissions) {
    validatePermissions(data.permissions);
  }

  // role.name = data.name ? data.name.toLowerCase() : role.name;
  // role.description = data.description || role.description;
   if (data.name !== undefined) {
    role.name = data.name.toLowerCase();
  }

  // Update description
  // Allows "", null, or any string
  if (data.description !== undefined) {
    role.description = data.description;
  }

  if (data.permissions) {
    role.permissions = {
      ...role.permissions,
      ...data.permissions,
    };
  }

  return await role.save();
};

//////////////////////////////////////////////////////////////
// 🔹 Delete Role
//////////////////////////////////////////////////////////////
export const updateRoleStatus = async (id, isActive) => {
  const role = await Role.findById(id);

  if (!role) throw new Error("Role not found");

  if (role.isSystemRole) {
    throw new Error("System role cannot be modified");
  }

  role.isActive = isActive;
  return await role.save();
};
export const deleteRoleService = async (id) => {
  const role = await Role.findById(id);

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  // System role cannot be deleted
  if (role.isSystemRole) {
    throw new ApiError(400, "System role cannot be deleted");
  }

  // Check if role is assigned to any user
  const assignedUser = await User.findOne({
    role: role._id,
  });

  if (assignedUser) {
    throw new ApiError(
      400,
      "This role is assigned to one or more users and cannot be deleted"
    );
  }

  await Role.findByIdAndDelete(id);

  return "Role deleted successfully";
};