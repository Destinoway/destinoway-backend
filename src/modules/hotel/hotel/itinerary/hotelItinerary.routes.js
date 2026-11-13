import { Router } from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";
import {
  createHotelItineraryController,
  updateHotelItineraryCouponController,
} from "./hotelItinerary.controller.js";
import { validateCreateHotelItineraryRequest } from "./validators/createHotelItinerary.validator.js";

const router = Router();

router.patch(
  "/itinerary/:itineraryId/coupon",
  protectCustomer,
  updateHotelItineraryCouponController,
);

router.post(
  "/search/:searchId/:hotelId/itinerary",
  protectCustomer,
  validateCreateHotelItineraryRequest,
  createHotelItineraryController
);

export default router;
