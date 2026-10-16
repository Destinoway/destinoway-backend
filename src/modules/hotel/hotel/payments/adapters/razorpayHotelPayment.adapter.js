import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import BaseHotelPaymentAdapter from "./baseHotelPayment.adapter.js";

const toMinorUnits = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Payment amount must be a positive number");
  }
  return Math.round(value * 100);
};

class RazorpayHotelPaymentAdapter extends BaseHotelPaymentAdapter {
  constructor() {
    super();
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      const error = new Error(
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured"
      );
      error.statusCode = 503;
      throw error;
    }
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder({ amount, currency, bookingId }) {
    const order = await this.client.orders.create({
      amount: toMinorUnits(amount),
      currency,
      receipt: String(bookingId).slice(0, 40),
      notes: { hotelBookingId: String(bookingId) },
    });
    return {
      gatewayOrderId: order.id,
      checkout: {
        keyId: this.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }

  async verifyPayment({
    gatewayOrderId,
    paymentId,
    signature,
    expectedAmount,
    expectedCurrency,
  }) {
    if (
      typeof gatewayOrderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string" ||
      !/^[a-f\d]{64}$/i.test(signature)
    ) {
      return { success: false, reason: "Invalid Razorpay verification fields" };
    }

    const expectedSignature = createHmac("sha256", this.keySecret)
      .update(`${gatewayOrderId}|${paymentId}`)
      .digest();
    const suppliedSignature = Buffer.from(signature, "hex");
    if (
      expectedSignature.length !== suppliedSignature.length ||
      !timingSafeEqual(expectedSignature, suppliedSignature)
    ) {
      return { success: false, reason: "Invalid Razorpay payment signature" };
    }

    const payment = await this.client.payments.fetch(paymentId);
    if (
      payment.order_id !== gatewayOrderId ||
      payment.status !== "captured" ||
      payment.amount !== toMinorUnits(expectedAmount) ||
      payment.currency !== expectedCurrency
    ) {
      return {
        success: false,
        reason: "Razorpay payment is not captured for the expected order and amount",
      };
    }

    return { success: true, gatewayPaymentId: payment.id };
  }

  async getCheckoutDetails(transaction) {
    const order = await this.client.orders.fetch(transaction.gatewayOrderId);
    return {
      keyId: this.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  }

  async refundPayment({ paymentId, amount }) {
    return this.client.payments.refund(paymentId, {
      amount: toMinorUnits(amount),
    });
  }
}

export default RazorpayHotelPaymentAdapter;
