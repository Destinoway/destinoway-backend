import crypto from "crypto";
import mongoose from "mongoose";

import HotelTempBooking from "../hotel/hotelTempBooking/hotelCart.model.js";
import { RAZORPAY_WEBHOOK_SECRET } from "../../config/razorpay.config.js";

export const paymentWebhookService = async (req) => {
  // ============================================
  // Razorpay Signature
  // ============================================

  const razorpaySignature = req.headers["x-razorpay-signature"];

  if (!razorpaySignature) {
    throw new Error("Webhook signature missing");
  }

  // ============================================
  // Verify Signature
  // ============================================

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(req.body) // raw body
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw new Error("Invalid webhook signature");
  }

  // ============================================
  // Parse Payload
  // ============================================

  const payload = JSON.parse(req.body.toString());

  const event = payload.event;

  console.log("Webhook Event =>", event);

  // ============================================
  // We only handle payment.captured
  // ============================================

  if (event !== "payment.captured") {
    return;
  }

  // ============================================
  // Payment Object
  // ============================================

  const payment = payload.payload.payment.entity;

  const orderId = payment.order_id;

  const paymentId = payment.id;

  // ============================================
  // Find Booking
  // ============================================

  const booking = await HotelTempBooking.findOne({
    "payment.orderId": orderId,
  });

  if (!booking) {
    console.log("Booking not found for webhook");
    return;
  }

  // ============================================
  // Duplicate Webhook
  // ============================================

  if (booking.paymentStatus === "paid") {
    console.log("Already Paid");
    return;
  }

  // ============================================
  // Amount Check
  // ============================================

  if (
    payment.amount !==
    Math.round(booking.payableAmount * 100)
  ) {
    throw new Error("Amount mismatch");
  }

  // ============================================
  // Update Booking
  // ============================================

  booking.payment.paymentId = paymentId;

  booking.payment.signature = razorpaySignature;

  booking.payment.status = "success";

  booking.payment.amount = booking.payableAmount;

  booking.payment.gatewayResponse = payment;

  booking.payment.paidAt = new Date();

  booking.paymentStatus = "paid";

  booking.tempBookingStatus = "payment_success";

  await booking.save();

  console.log(
    `Webhook Payment Success : ${booking._id}`
  );

  // ============================================
  // Future
  // ============================================

  // await addBalanceService(...)

  // await hotelTicketingService(...)
};