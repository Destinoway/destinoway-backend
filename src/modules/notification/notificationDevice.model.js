import mongoose from "mongoose";

const notificationDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fid: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("NotificationDevice", notificationDeviceSchema);
