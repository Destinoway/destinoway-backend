import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path"; // ✅ ADD THIS
import { fileURLToPath } from "url"; // ✅ ADD THIS

import Role from "../src/modules/role/role.model.js";
import User from "../src/modules/user/user.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const createAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    const adminRole = await Role.findOne({
      name: "admin",
      type: "admin",
    });

    if (!adminRole) {
      console.log("❌ Admin role not found. Create role first.");
      process.exit(1);
    }

    const existingAdmin = await User.findOne({
      email: "admin@panjourney.com",
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    await User.create({
      name: "Super Admin",
      email: "admin@panjourney.com",
      password: hashedPassword,
      role: adminRole._id,
      provider: "local",
      isEmailVerified: true,
      type: "admin", // ✅ ADD THIS
    });
    console.log("🎉 Admin created successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

createAdmin();
