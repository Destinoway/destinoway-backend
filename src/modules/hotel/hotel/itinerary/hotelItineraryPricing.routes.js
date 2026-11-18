import { Router } from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";
import { getHotelItineraryPricingController } from "./hotelItinerary.controller.js";

const router = Router();

router.get(
  "/itinerary/:itineraryId/pricing",
  protectCustomer,
  getHotelItineraryPricingController,
);

export default router;
