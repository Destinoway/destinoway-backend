import { Router } from "express";

import { hotelDetailsController } from "../controllers/hotelDetails.controller.js";
import { hotelRoomsController } from "../controllers/hotelRooms.controller.js";

import { validateHotelDetailsParams } from "../validators/hotelDetails.validator.js";

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

export default router;