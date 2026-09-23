import express from "express";
import { protectCustomer } from "./../../middleware/customerAuth.middleware.js";
import {
  createOrderController,
  verifyPaymentController,
  paymentWebhookController
} from "./payment.controller.js";

const router = express.Router();

router.post("/create-booking", protectCustomer, createOrderController);
router.post(
  "/booking-payment-verify",
  protectCustomer,
  verifyPaymentController,
);
router.post("/webhook", paymentWebhookController);
export default router;
