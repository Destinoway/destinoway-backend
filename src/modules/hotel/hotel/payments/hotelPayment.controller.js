import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import {
  createHotelPaymentOrder,
  getHotelPaymentStatus,
  handleHotelPaymentRefundWebhook,
  handleHotelPaymentWebhook,
  verifyHotelPayment,
} from "./hotelPayment.service.js";
import { logHotelEvent } from "../utils/hotelObservability.js";

const sendError = (res, message, statusCode) =>
  res.status(statusCode).json({
    success: false,
    message,
    error: { statusCode },
  });

export const createHotelPaymentOrderController = async (req, res, next) => {
  const correlationId = randomUUID();
  logHotelEvent("info", "hotel.payment.request.started", {
    correlationId,
    operation: "create_order",
    bookingId: String(req.params.bookingId),
  });
  try {
    const data = await createHotelPaymentOrder({
      bookingId: req.params.bookingId,
      gateway: req.body.gateway,
      userId: req.user._id ?? req.user.id,
      correlationId,
    });
    logHotelEvent("info", "hotel.payment.request.completed", {
      correlationId,
      operation: "create_order",
      bookingId: String(req.params.bookingId),
      transactionId: data.transactionId,
      gateway: data.gateway,
    });
    return res.status(201).json({
      success: true,
      message: "Hotel payment order created",
      data,
      meta: null,
    });
  } catch (error) {
    logHotelEvent("error", "hotel.payment.request.failed", {
      correlationId,
      operation: "create_order",
      bookingId: String(req.params.bookingId),
      errorCode: error.code ?? null,
      statusCode: error.statusCode ?? null,
      errorMessage: error.message,
    });
    return next(error);
  }
};

export const verifyHotelPaymentController = async (req, res, next) => {
  const correlationId = randomUUID();
  logHotelEvent("info", "hotel.payment.request.started", {
    correlationId,
    operation: "verify_payment",
    transactionId: req.body.transactionId ?? null,
  });
  try {
    const data = await verifyHotelPayment({
      transactionId: req.body.transactionId,
      gatewayOrderId: req.body.gatewayOrderId ?? req.body.orderId,
      paymentId: req.body.paymentId ?? req.body.paymentIntentId,
      signature: req.body.signature,
      gatewayName: req.body.gateway,
      userId: req.user._id ?? req.user.id,
      correlationId,
    });
    logHotelEvent("info", "hotel.payment.request.completed", {
      correlationId,
      operation: "verify_payment",
      bookingId: data.bookingId,
      transactionId: data.paymentTransactionId,
      gateway: data.gateway,
      supplierBookingStatus: data.supplierBookingStatus,
    });
    return res.status(200).json({
      success: true,
      message:
        data.supplierBookingStatus === "confirmed"
          ? "Hotel payment and supplier booking confirmed"
          : "Hotel payment verified; supplier booking status is being processed",
      data,
      meta: null,
    });
  } catch (error) {
    logHotelEvent("error", "hotel.payment.request.failed", {
      correlationId,
      operation: "verify_payment",
      transactionId: req.body.transactionId ?? null,
      errorCode: error.code ?? null,
      statusCode: error.statusCode ?? null,
      errorMessage: error.message,
    });
    return next(error);
  }
};

export const hotelPaymentStatusController = async (req, res, next) => {
  const correlationId = randomUUID();
  logHotelEvent("info", "hotel.payment.request.started", {
    correlationId,
    operation: "payment_status",
    bookingId: String(req.params.bookingId),
  });
  try {
    const data = await getHotelPaymentStatus({
      bookingId: req.params.bookingId,
      userId: req.user._id ?? req.user.id,
      correlationId,
    });
    logHotelEvent("info", "hotel.payment.request.completed", {
      correlationId,
      operation: "payment_status",
      bookingId: data.bookingId,
      transactionId: data.paymentTransactionId,
      paymentStatus: data.paymentStatus,
      supplierBookingStatus: data.supplierBookingStatus,
    });
    return res.status(200).json({
      success: true,
      message: "Hotel payment status retrieved",
      data,
      meta: null,
    });
  } catch (error) {
    logHotelEvent("error", "hotel.payment.request.failed", {
      correlationId,
      operation: "payment_status",
      bookingId: String(req.params.bookingId),
      errorCode: error.code ?? null,
      statusCode: error.statusCode ?? null,
      errorMessage: error.message,
    });
    return next(error);
  }
};

const parseWebhookBody = (body) => {
  if (!Buffer.isBuffer(body)) {
    throw Object.assign(new Error("Webhook requires the raw request body"), {
      statusCode: 400,
    });
  }
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw Object.assign(new Error("Webhook request body is not valid JSON"), {
      statusCode: 400,
    });
  }
};

const verifyRazorpayWebhook = (body, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw Object.assign(new Error("Razorpay webhook secret is not configured"), {
      statusCode: 503,
    });
  }
  if (typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(signature, "hex");
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
};

export const razorpayHotelWebhookController = async (req, res) => {
  const correlationId = randomUUID();
  logHotelEvent("info", "hotel.payment.webhook.started", {
    correlationId,
    gateway: "razorpay",
  });
  try {
    if (!verifyRazorpayWebhook(req.rawBody, req.get("x-razorpay-signature"))) {
      logHotelEvent("error", "hotel.payment.webhook.signature_rejected", {
        correlationId,
        gateway: "razorpay",
      });
      return sendError(res, "Invalid Razorpay webhook signature", 400);
    }
    const event = parseWebhookBody(req.rawBody);
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id || payment.status !== "captured") {
        return sendError(res, "Invalid captured payment webhook payload", 400);
      }
      await handleHotelPaymentWebhook({
        gatewayName: "razorpay",
        gatewayOrderId: payment.order_id,
        gatewayPaymentId: payment.id,
        gatewayAmount: payment.amount,
        gatewayCurrency: payment.currency,
        correlationId,
      });
    } else if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      if (!refund?.payment_id || !refund?.id || !refund?.status) {
        return sendError(res, "Invalid refund webhook payload", 400);
      }
      await handleHotelPaymentRefundWebhook({
        gatewayName: "razorpay",
        gatewayPaymentId: refund.payment_id,
        refundId: refund.id,
        refundStatus: refund.status,
        refundAmount: refund.amount,
        correlationId,
      });
    }
    logHotelEvent("info", "hotel.payment.webhook.completed", {
      correlationId,
      gateway: "razorpay",
      eventType: event.event ?? null,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    logHotelEvent("error", "hotel.payment.webhook.failed", {
      correlationId,
      gateway: "razorpay",
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return sendError(res, error.message, error.statusCode ?? 500);
  }
};

export const stripeHotelWebhookController = async (req, res) => {
  const correlationId = randomUUID();
  logHotelEvent("info", "hotel.payment.webhook.started", {
    correlationId,
    gateway: "stripe",
  });
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return sendError(res, "Stripe webhook secret is not configured", 503);
    }
    if (!Buffer.isBuffer(req.rawBody)) {
      return sendError(res, "Webhook requires the raw request body", 400);
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return sendError(res, "Stripe secret key is not configured", 503);
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.get("stripe-signature"),
        secret
      );
    } catch {
      logHotelEvent("error", "hotel.payment.webhook.signature_rejected", {
        correlationId,
        gateway: "stripe",
      });
      return sendError(res, "Invalid Stripe webhook signature", 400);
    }
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      await handleHotelPaymentWebhook({
        gatewayName: "stripe",
        gatewayOrderId: intent.id,
        gatewayPaymentId: intent.id,
        gatewayAmount: intent.amount,
        gatewayCurrency: intent.currency,
        correlationId,
      });
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const refund = charge.refunds?.data?.[0];
      if (charge.payment_intent && refund) {
        await handleHotelPaymentRefundWebhook({
          gatewayName: "stripe",
          gatewayPaymentId: charge.payment_intent,
          refundId: refund.id,
          refundStatus: refund.status,
          refundAmount: refund.amount,
          correlationId,
        });
      }
    }
    logHotelEvent("info", "hotel.payment.webhook.completed", {
      correlationId,
      gateway: "stripe",
      eventType: event.type,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    logHotelEvent("error", "hotel.payment.webhook.failed", {
      correlationId,
      gateway: "stripe",
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return sendError(res, error.message, error.statusCode ?? 500);
  }
};
