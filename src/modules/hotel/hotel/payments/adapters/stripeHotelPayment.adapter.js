import Stripe from "stripe";
import BaseHotelPaymentAdapter from "./baseHotelPayment.adapter.js";
import { traceHotelPaymentStep } from "../../utils/hotelObservability.js";

const toMinorUnits = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Payment amount must be a positive number");
  }
  return Math.round(value * 100);
};

class StripeHotelPaymentAdapter extends BaseHotelPaymentAdapter {
  constructor() {
    super();
    if (!process.env.STRIPE_SECRET_KEY) {
      const error = new Error("STRIPE_SECRET_KEY must be configured");
      error.statusCode = 503;
      throw error;
    }
    this.client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async createOrder({ amount, currency, bookingRefNo, correlationId }) {
    const intent = await traceHotelPaymentStep({
      correlationId,
      step: "gateway.stripe.create_payment_intent",
      fields: { bookingRefNo, gateway: "stripe" },
      operation: () =>
        this.client.paymentIntents.create({
          amount: toMinorUnits(amount),
          currency: currency.toLowerCase(),
          metadata: { hotelBookingRefNo: String(bookingRefNo) },
        }),
    });
    if (!intent.client_secret) {
      throw new Error("Stripe did not return a PaymentIntent client secret");
    }
    return {
      gatewayOrderId: intent.id,
      checkout: {
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        amount: intent.amount,
        currency: intent.currency.toUpperCase(),
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      },
    };
  }

  async verifyPayment({
    gatewayOrderId,
    expectedAmount,
    expectedCurrency,
    correlationId,
  }) {
    const intent = await traceHotelPaymentStep({
      correlationId,
      step: "gateway.stripe.retrieve_payment_intent",
      fields: { gateway: "stripe" },
      operation: () =>
        this.client.paymentIntents.retrieve(gatewayOrderId),
    });
    if (
      intent.id !== gatewayOrderId ||
      intent.status !== "succeeded" ||
      intent.amount !== toMinorUnits(expectedAmount) ||
      intent.currency.toUpperCase() !== expectedCurrency
    ) {
      return {
        success: false,
        reason: "Stripe payment has not succeeded for the expected order and amount",
      };
    }
    return { success: true, gatewayPaymentId: intent.id };
  }

  async getCheckoutDetails(transaction, { correlationId } = {}) {
    const intent = await traceHotelPaymentStep({
      correlationId,
      step: "gateway.stripe.retrieve_checkout_intent",
      fields: {
        bookingId: String(transaction.bookingId),
        transactionId: transaction.transactionId,
        gateway: "stripe",
      },
      operation: () =>
        this.client.paymentIntents.retrieve(transaction.gatewayOrderId),
    });
    if (!intent.client_secret) {
      throw new Error("Stripe did not return a PaymentIntent client secret");
    }
    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency.toUpperCase(),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    };
  }

  async refundPayment({ paymentId, amount, correlationId }) {
    return traceHotelPaymentStep({
      correlationId,
      step: "gateway.stripe.create_refund",
      fields: { gateway: "stripe" },
      operation: () =>
        this.client.refunds.create({
          payment_intent: paymentId,
          amount: toMinorUnits(amount),
        }),
    });
  }
}

export default StripeHotelPaymentAdapter;
