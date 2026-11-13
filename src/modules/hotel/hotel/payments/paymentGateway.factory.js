import RazorpayHotelPaymentAdapter from "./adapters/razorpayHotelPayment.adapter.js";
import StripeHotelPaymentAdapter from "./adapters/stripeHotelPayment.adapter.js";

const adapters = {
  razorpay: RazorpayHotelPaymentAdapter,
  stripe: StripeHotelPaymentAdapter,
};

export const createHotelPaymentGateway = (gatewayName) => {
  const Adapter = adapters[gatewayName];
  if (!Adapter) {
    const error = new Error(`Unsupported hotel payment gateway: ${gatewayName}`);
    error.statusCode = 400;
    throw error;
  }
  return new Adapter();
};
