import { Router } from "express";

import { hotelDetailsController } from "../controllers/hotelDetails.controller.js";
import { hotelRoomsController } from "../controllers/hotelRooms.controller.js";
import { hotelPricingController } from "../controllers/hotelPricing.controller.js";

import {
  validateHotelDetailsParams,
  validateHotelPricingParams,
} from "../validators/hotelDetails.validator.js";

const router = Router();

router.get(
  "/search/:searchId/:hotelId/content",
  validateHotelDetailsParams,
  hotelDetailsController
);

router.get(
  "/search/:searchId/:hotelId/rooms",
  validateHotelDetailsParams,
  hotelRoomsController
);

router.post(
  "/search/:searchId/:hotelId/price-check",
  validateHotelPricingParams,
  hotelPricingController
);

export default router;