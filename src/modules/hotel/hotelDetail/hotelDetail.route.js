import express from "express";
import {
  getHotelDetail,getRoomPricing
} from "./hotelDetail.controller.js";

const router = express.Router();

router.post(
  "/",
  getHotelDetail
);

router.post(
  "/room-pricing",
  getRoomPricing
);

export default router;