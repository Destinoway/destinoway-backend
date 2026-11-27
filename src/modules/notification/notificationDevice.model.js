import mongoose from "mongoose";

const notificationDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Keep the existing MongoDB field and unique index for both target types.
    fid: {
      type: String,
      required: true,
      unique: true,
    },
    targetType: {
      type: String,
      enum: ["fid", "token"],
      default: "fid",
    },
  },
  { timestamps: true },
);

export default mongoose.model("NotificationDevice", notificationDeviceSchema);
