import { createHmac, timingSafeEqual } from "node:crypto";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import {
  createBusPaymentOrder,
  getBusPaymentStatus,
  handleBusPaymentCapturedWebhook,
  handleBusRefundProcessedWebhook,
  reconcileBusPayment,
  verifyBusPayment,
} from "./busPayment.service.js";

const badRequest = (res, message) => res.status(400).json({ success: false, message, data: null, meta: null });

export const createBusPaymentOrderController = asyncHandler(async (req, res) => {
  const result = await createBusPaymentOrder({ bookingId: req.params.bookingId, userId: req.user._id });
  return sendSuccess(res, "Bus payment order ready", result);
});

export const verifyBusPaymentController = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body || {};
  const result = await verifyBusPayment({ bookingId: req.params.bookingId, userId: req.user._id, orderId, paymentId, signature });
  return sendSuccess(res, "Bus payment verified; supplier booking status updated", result);
});

export const getBusPaymentStatusController = asyncHandler(async (req, res) => {
  const result = await getBusPaymentStatus({ bookingId: req.params.bookingId, userId: req.user._id });
  return sendSuccess(res, "Bus payment status fetched", result);
});

export const reconcileBusPaymentController = asyncHandler(async (req, res) => {
  const result = await reconcileBusPayment({ bookingId: req.params.bookingId, userId: req.user._id });
  return sendSuccess(res, "Bus ticket status checked", result);
});

export const busRazorpayWebhookController = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get("x-razorpay-signature");
  if (!secret) return res.status(503).json({ success: false, message: "Webhook is not configured" });
  if (!Buffer.isBuffer(req.rawBody) || typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) return badRequest(res, "Invalid webhook signature");
  const expected = createHmac("sha256", secret).update(req.rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return badRequest(res, "Invalid webhook signature");
  try {
    const event = JSON.parse(req.rawBody.toString("utf8"));
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (payment?.id && payment?.order_id) await handleBusPaymentCapturedWebhook(payment);
    } else if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      if (refund?.id && refund?.payment_id) await handleBusRefundProcessedWebhook(refund);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("BUS PAYMENTS: webhook processing failed", error.message);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
