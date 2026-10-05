import express from "express";

import {
  confirmHotelBookingController,
} from "./hotelBooking.controller.js";

const router =
  express.Router();

router.post(
  "/confirm",
  confirmHotelBookingController
);

export default router;