import express from "express";

import {
  createTempBooking,
} from "./tempBooking.controller.js";

const router =
  express.Router();

router.post(
  "/",
  createTempBooking
);

export default router;