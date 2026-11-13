import { Router } from "express";
import { protect } from "../../../middleware/auth.middleware.js";
import { checkPermission } from "../../../middleware/checkPermission.js";
import {
  getAdminHotelBookingByIdController,
  getAdminHotelBookingsController,
} from "./adminHotelBookings.controller.js";

const router = Router();

router.get(
  "/hotel-bookings",
  protect,
  checkPermission("hotelBookings", "read"),
  getAdminHotelBookingsController,
);
router.get(
  "/hotel-bookings/:bookingRefNo",
  protect,
  checkPermission("hotelBookings", "read"),
  getAdminHotelBookingByIdController,
);

export default router;
