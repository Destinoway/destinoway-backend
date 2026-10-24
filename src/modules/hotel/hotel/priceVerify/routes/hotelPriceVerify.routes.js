import { Router } from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";

import { hotelPriceVerifyController } from "../controllers/hotelPriceVerify.controller.js";
import { validateHotelPriceVerifyRequest } from "../validators/hotelPriceVerify.validator.js";

const router = Router();

router.post(
  "/search/:searchId/:hotelId/price-check",
  protectCustomer,
  validateHotelPriceVerifyRequest,
  hotelPriceVerifyController
);

export default router;
