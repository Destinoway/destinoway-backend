import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  deleteByPattern,
  getCache,
  setCache,
} from "../../utils/cache/cache.js";
import ApiError from "../../utils/response/ApiError.js";
import Role from "../role/role.model.js";
import User from "./user.model.js";

// PAGINATION

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, parseInt(query.limit) || 10);
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || "createdAt";
  const order = query.order === "asc" ? 1 : -1;

  return { page, limit, skip, sortBy, order };
};

// CREATE STAFF (ADMIN ONLY)

export const createStaff = async (data) => {
  if (!data.password) throw new ApiError(400, "Password is required");
  if (!data.role) throw new ApiError(400, "Role ID is required");

  if (!mongoose.Types.ObjectId.isValid(data.role)) {
    throw new ApiError(400, "Invalid role ID");
  }

  const roleDoc = await Role.findById(data.role);

  if (!roleDoc) {
    throw new ApiError(400, "Role not found");
  }

  const existingEmail = await User.findOne({
    email: data.email,
  });

  if (existingEmail) {
    throw new ApiError(400, "Email already exists");
  }

  const existingMobile = await User.findOne({
    mobile: data.mobile,
  });

  if (existingMobile) {
    throw new ApiError(400, "Mobile already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    name: data.name,
    email: data.email,
    mobile: data.mobile,
    password: hashedPassword,
    role: roleDoc._id,
    type: "staff",
    providers: ["email"],
    isEmailVerified: true,
  });

  await deleteByPattern("users:*");

  return User.findById(user._id)
    .select("-password -refreshToken")
    .populate("role", "name permissions");
};

// GET ALL USERS (ADMIN / STAFF)

export const getAllUsers = async (query) => {
  const cacheKey = `users:${JSON.stringify(query)}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  const { page, skip, sortBy, order, limit } = getPagination(query);
  const search = query.search?.trim() || "";

  if (
    query.type &&
    !["admin", "staff", "customer"].includes(query.type.toLowerCase())
  ) {
    throw new ApiError(400, "Invalid user type");
  }
  if (query.roleId && query.roleName) {
    throw new ApiError(400, "Use either roleId or roleName");
  }
  const allowedSortFields = ["createdAt", "updatedAt", "name", "email"];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const filters = {};

  // Filter by user type
  if (query.type) {
    filters.type = query.type.toLowerCase();
  }

  if (query.isActive !== undefined) {
    filters.isActive = query.isActive === "true";
  }

  // Filter by role id
  if (query.roleId) {
    if (!mongoose.Types.ObjectId.isValid(query.roleId)) {
      throw new ApiError(400, "Invalid role ID");
    }

    filters.role = query.roleId;
  }

  // Filter by role name
  if (query.roleName) {
    const roleDoc = await Role.findOne({
      name: query.roleName.toLowerCase(),
    });

    if (!roleDoc) {
      throw new ApiError(400, "Role not found");
    }

    filters.role = roleDoc._id;
  }

  const searchQuery = {
    ...filters,

    ...(search && {
      $or: [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          mobile: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    }),
  };
  const [data, total] = await Promise.all([
    User.find(searchQuery)
      .select("-password -refreshToken")
      .populate("role", "name permissions")
      .sort({
        [finalSortBy]: order,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(searchQuery),
  ]);

  const result = {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  await setCache(cacheKey, result, 300);

  return result;
};

// GET CUSTOMERS (SEPARATE - FUTURE READY)

// export const getCustomers = async (query) => {
//   const cacheKey = `customers:${JSON.stringify(query)}`;
//   const cached = await getCache(cacheKey);
//   if (cached) return cached;

//   const roleDoc = await Role.findOne({ name: "customer" });
//   if (!roleDoc) throw new ApiError(400, "Customer role not found");

//   const { skip, sortBy, order, limit } = getPagination(query);
//   const search = query.search || "";

//   const searchQuery = {
//     role: roleDoc._id,
//     ...(search && {
//       $or: [
//         { name: { $regex: search, $options: "i" } },
//         { mobile: { $regex: search, $options: "i" } },
//       ],
//     }),
//   };

//   const [data, total] = await Promise.all([
//     User.find(searchQuery)
//       .select("-password -refreshToken")
//       .populate("role", "name")
//       .sort({ [sortBy]: order })
//       .skip(skip)
//       .limit(limit)
//       .lean(),

//     User.countDocuments(searchQuery),
//   ]);

//   const result = {
//     data,
//     pagination: {
//       total,
//       page: getPagination(query).page,
//       limit,
//       totalPages: Math.ceil(total / limit),
//     },
//   };

//   await setCache(cacheKey, result, 300);
//   return result;
// };

// GET SINGLE USER
export const getSingleUser = async (id) => {
  // Validate Mongo ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }

  const user = await User.findById(id)
    .select("-password -refreshToken")
    .populate("role", "name permissions")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

// UPDATE USER
export const updateUser = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  if (data.email) {
    const exists = await User.findOne({ email: data.email });
    if (exists && exists._id.toString() !== id) {
      throw new ApiError(400, "Email already in use");
    }
    user.email = data.email;
  }

  if (data.name) user.name = data.name;
  if (data.mobile) user.mobile = data.mobile;

  if (data.password) {
    user.password = await bcrypt.hash(data.password, 10);
  }

  if (data.role) {
    if (!mongoose.Types.ObjectId.isValid(data.role)) {
      throw new ApiError(400, "Invalid role ID");
    }
    const roleDoc = await Role.findById(data.role);
    if (!roleDoc) throw new ApiError(400, "Role not found");

    user.role = roleDoc._id;
  }

  await user.save();
  await deleteByPattern("users:*");

  user.password = undefined;
  return user;
};

export const updateUserStatus = async (id, isActive) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isActive = isActive;
  await user.save();
  await deleteByPattern("users:*");
  return user;
};

// DELETE USER
