import { Router } from "express";
import { protectCustomer } from "../../../../middleware/customerAuth.middleware.js";
import {
  createHotelPaymentOrderController,
  hotelPaymentStatusController,
  razorpayHotelWebhookController,
  stripeHotelWebhookController,
  verifyHotelPaymentController,
} from "./hotelPayment.controller.js";

const router = Router();

router.post(
  "/bookings/:bookingId/order",
  protectCustomer,
  createHotelPaymentOrderController
);
router.post("/verify", protectCustomer, verifyHotelPaymentController);
router.get(
  "/bookings/:bookingId/status",
  protectCustomer,
  hotelPaymentStatusController
);
router.post("/webhooks/razorpay", razorpayHotelWebhookController);
router.post("/webhooks/stripe", stripeHotelWebhookController);

export default router;
