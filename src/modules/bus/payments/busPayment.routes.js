import express from "express";
import { protectCustomer } from "../../../middleware/customerAuth.middleware.js";
import {
  busRazorpayWebhookController,
  createBusPaymentOrderController,
  getBusPaymentStatusController,
  reconcileBusPaymentController,
  verifyBusPaymentController,
} from "./busPayment.controller.js";

const router = express.Router();
router.post("/webhooks/razorpay", busRazorpayWebhookController);
router.post("/:bookingId/order", protectCustomer, createBusPaymentOrderController);
router.post("/:bookingId/verify", protectCustomer, verifyBusPaymentController);
router.get("/:bookingId/status", protectCustomer, getBusPaymentStatusController);
router.post("/:bookingId/reconcile", protectCustomer, reconcileBusPaymentController);
export default router;
