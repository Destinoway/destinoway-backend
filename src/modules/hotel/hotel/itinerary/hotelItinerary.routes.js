import { Router } from "express";
import { createHotelItineraryController } from "./hotelItinerary.controller.js";
import { validateCreateHotelItineraryRequest } from "./validators/createHotelItinerary.validator.js";

const router = Router();

router.post(
  "/search/:searchId/:hotelId/itinerary",
  validateCreateHotelItineraryRequest,
  createHotelItineraryController
);

export default router;
