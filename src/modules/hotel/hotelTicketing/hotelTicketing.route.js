import express from "express";
import { hotelTicketingController } from "./hotelTicketing.controller.js";

const router = express.Router();

router.post(
  "/HotelTicketing",
  hotelTicketingController
);

export default router;