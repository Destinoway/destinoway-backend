import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: [50, "Role name cannot exceed 50 characters"],
    },

    description: {
      type: String,
      default: "",
     maxlength: [250, "Description cannot exceed 250 characters"],
    },
    type: {
      type: String,
      enum: ["admin", "staff", "customer"],
      required: true,
    },

    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    isSystemRole: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Role", roleSchema);
