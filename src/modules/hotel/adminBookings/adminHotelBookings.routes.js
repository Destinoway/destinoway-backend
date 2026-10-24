import { Router } from "express";
import { protect } from "../../../middleware/auth.middleware.js";
import { checkPermission } from "../../../middleware/checkPermission.js";
import { getAdminHotelBookingsController } from "./adminHotelBookings.controller.js";

const router = Router();

router.get(
  "/hotel-bookings",
  protect,
  checkPermission("hotelBookings", "read"),
  getAdminHotelBookingsController,
);

export default router;
