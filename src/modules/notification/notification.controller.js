import mongoose from "mongoose";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import ApiError from "../../utils/response/ApiError.js";
import { sendSuccess } from "../../utils/response/ApiResponse.js";
import {
  customerExists,
  deleteDeviceRegistration,
  getInbox,
  getUnreadCount,
  markNotificationRead,
  publishNotification,
  upsertDeviceRegistration,
} from "./notification.service.js";

export const requireNotificationCustomer = (req, res, next) => {
  if (req.user.type !== "customer") {
    return next(new ApiError(403, "Customer account required"));
  }
  return next();
};

export const listNotifications = asyncHandler(async (req, res) => {
  const { cursor, limit = "20" } = req.query;
  if (cursor !== undefined && !mongoose.isObjectIdOrHexString(cursor)) {
    throw new ApiError(400, "Invalid notification cursor");
  }
  if (typeof limit !== "string" || !/^(?:[1-9]|[1-4]\d|50)$/.test(limit)) {
    throw new ApiError(400, "Limit must be an integer from 1 to 50");
  }
  const data = await getInbox(req.user, { cursor, limit: Number(limit) });
  return sendSuccess(res, "Notifications fetched", data);
});

export const getNotificationUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await getUnreadCount(req.user);
  return sendSuccess(res, "Unread notification count fetched", { unreadCount });
});

export const readNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    throw new ApiError(400, "Invalid notification ID");
  }
  const data = await markNotificationRead(req.user, req.params.id);
  if (!data) {
    throw new ApiError(404, "Notification not found");
  }
  return sendSuccess(res, "Notification marked as read", data);
});

export const registerDevice = asyncHandler(async (req, res) => {
  const { fcmToken, fid } = req.body ?? {};
  if (fcmToken !== undefined && fid !== undefined) {
    throw new ApiError(400, "Provide either fcmToken or fid");
  }
  if (fcmToken !== undefined) {
    if (typeof fcmToken !== "string" || !/^[^\s<>]{1,4096}$/.test(fcmToken)) {
      throw new ApiError(400, "A valid FCM registration token is required");
    }
  } else if (typeof fid !== "string" || !/^[c-f][\w-]{21}$/.test(fid)) {
    throw new ApiError(400, "A valid Firebase Installation ID is required");
  }

  const device = await upsertDeviceRegistration(
    req.user._id,
    fcmToken ?? fid,
    fcmToken === undefined ? "fid" : "token",
  );
  return sendSuccess(res, "Device registered", { id: device.id });
});

export const unregisterDevice = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    throw new ApiError(400, "Invalid device ID");
  }

  await deleteDeviceRegistration(req.user._id, req.params.id);

  return sendSuccess(res, "Device registration removed");
});

export const sendAdminNotification = asyncHandler(async (req, res) => {
  if (req.user.type !== "admin") {
    throw new ApiError(403, "Only admins can send push notifications");
  }

  const { audience = "customer", customerId, title, body } = req.body ?? {};
  if (audience !== "all" && audience !== "customer") {
    throw new ApiError(400, 'Audience must be "all" or "customer"');
  }
  if (audience === "all" && customerId !== undefined) {
    throw new ApiError(400, 'Omit customerId when audience is "all"');
  }
  if (audience === "customer" && !mongoose.isObjectIdOrHexString(customerId)) {
    throw new ApiError(400, "A valid customerId is required");
  }

  const messageTitle = typeof title === "string" ? title.trim() : "";
  const messageBody = typeof body === "string" ? body.trim() : "";
  if (!messageTitle || messageTitle.length > 100 || !messageBody || messageBody.length > 500) {
    throw new ApiError(400, "Title (1–100 characters) and body (1–500 characters) are required");
  }

  const payload = {
    title: messageTitle,
    body: messageBody,
    data: { type: "admin_notification" },
  };
  if (audience === "customer" && !await customerExists(customerId)) {
    throw new ApiError(404, "Customer not found");
  }

  const result = await publishNotification(audience === "all" ? null : customerId, payload);
  return sendSuccess(res, "Notification saved", result);
});
