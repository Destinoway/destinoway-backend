import express from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";
import { getHotelRequeryByUserController } from "./requery.controller.js";

const router = express.Router();

router.get(
  "/get-booking-details/:bookingId",
  protectCustomer,
  getHotelRequeryByUserController,
);

router.get(
  "/get-booking-details",
  protectCustomer,
  getHotelRequeryByUserController,
);

export default router;
