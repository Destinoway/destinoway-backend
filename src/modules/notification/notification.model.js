import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const notificationSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: "User", default: null },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Map, of: String },
}, { timestamps: true });

notificationSchema.index({ userId: 1, _id: -1 });

const notificationReadSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: "User", required: true },
  notificationId: { type: ObjectId, ref: "Notification", required: true },
  readAt: { type: Date, required: true },
});

notificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

export const Notification = mongoose.model("Notification", notificationSchema);
export const NotificationRead = mongoose.model("NotificationRead", notificationReadSchema);
