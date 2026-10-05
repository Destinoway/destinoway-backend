import express from "express";
import { protectCustomer } from "../../../middleware/customerAuth.middleware.js";
import { getHotelRequeryByUserController } from "./requery.controller.js";

const router = express.Router();

router.get(
  "/hotel/mybookings",
  protectCustomer,
  getHotelRequeryByUserController,
);

export default router;
