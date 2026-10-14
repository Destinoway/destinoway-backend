import { Router } from "express";

import { hotelPriceVerifyController } from "../controllers/hotelPriceVerify.controller.js";
import { validateHotelPriceVerifyRequest } from "../validators/hotelPriceVerify.validator.js";

const router = Router();

router.post(
  "/search/:searchId/:hotelId/price-check",
  validateHotelPriceVerifyRequest,
  hotelPriceVerifyController
);

export default router;
