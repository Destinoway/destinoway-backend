import express from "express";
import {
  cancelHotelController,
} from "./cancellation.controller.js";
const router = express.Router();
router.post(
  "/hotel/cancel",
  cancelHotelController
);


export default router;