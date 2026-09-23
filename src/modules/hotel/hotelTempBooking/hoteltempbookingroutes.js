import express from "express";
import { protectCustomer } from "./../../../middleware/customerAuth.middleware.js";
import {
  getTempBookingByBookingRefController,
  hotelTempBookingController,
  removeCouponController,
  updateCouponController,
} from "./hoteltempbookingController.js";

const router = express.Router();

router.post("/hotel-temp-booking", protectCustomer, hotelTempBookingController);
router.patch(
  "/hotel-temp-booking/couponApply",
  protectCustomer,
  updateCouponController,
);
router.put(
  "/hotel-temp-booking/couponRemove",
  protectCustomer,
  removeCouponController,
);
router.get(
  "/get-booking-details/:bookingRefNo",
  protectCustomer,
  getTempBookingByBookingRefController,
);

export default router;
