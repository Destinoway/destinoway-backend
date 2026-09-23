import express from "express";
import { protectCustomer } from "../../../middleware/customerAuth.middleware.js";
import { generateHotelInvoiceController } from "./invoice.controller.js";

const router = express.Router();

router.get(
  "/hotel/invoice/:bookingRefNo",
  protectCustomer,
  generateHotelInvoiceController,
);

export default router;