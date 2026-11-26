import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { protectCustomer } from "../../middleware/customerAuth.middleware.js";
import {
  getNotificationUnreadCount,
  listNotifications,
  readNotification,
  registerDevice,
  requireNotificationCustomer,
  sendAdminNotification,
  unregisterDevice,
} from "./notification.controller.js";

const router = express.Router();
export const adminNotificationRoutes = express.Router();

router.use(protectCustomer, requireNotificationCustomer);
router.get("/", listNotifications);
router.get("/unread-count", getNotificationUnreadCount);
router.post("/:id/read", readNotification);
router.post("/devices", registerDevice);
router.delete("/devices/:id", unregisterDevice);

adminNotificationRoutes.post("/send", protect, sendAdminNotification);

export default router;
