import { Router } from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";
import { createHotelItineraryController } from "./hotelItinerary.controller.js";
import { validateCreateHotelItineraryRequest } from "./validators/createHotelItinerary.validator.js";

const router = Router();

router.post(
  "/search/:searchId/:hotelId/itinerary",
  protectCustomer,
  validateCreateHotelItineraryRequest,
  createHotelItineraryController
);

export default router;
