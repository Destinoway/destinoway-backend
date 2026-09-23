import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: function () {
        return this.type !== "customer";
      },
      index: true,
    },
    nationality: {
      type: String,
      trim: true,
    },
    maritalStatus: {
      type: String,
      trim: true,
      enum: ["Single", "Married"],
    },
    anniversary: {
      type: Date,
    },
    dateOfBirth: {
      type: Date,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
      enum: ["Male", "Female", "Other"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
      match: /^\S+@\S+\.\S+$/,
    },

    mobile: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["admin", "staff", "customer"],
      required: true,
    },

    password: {
      type: String,
      select: false,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: function () {
        return this.type !== "customer";
      },
    },

    providers: {
      type: [
        {
          type: String,
          enum: ["email", "otp", "google"],
        },
      ],
      default: [],
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true, // 🔥 IMPORTANT
    },

    avatar: {
      type: String,
      default: null,
    },

    // 🔥 PROFILE FLOW
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    profilePopupDismissed: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isMobileVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ type: 1 });
userSchema.index({ role: 1 });
userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });

export default mongoose.model("User", userSchema);
