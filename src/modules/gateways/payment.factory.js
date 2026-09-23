import RazorpayAdapter
 from "./adapters/razorpay.adapter.js";

import StripeAdapter
 from "./adapters/stripe.adapter.js";

class PaymentFactory {

  static create(
    gatewayName,
    credentials
  ) {

    switch (gatewayName) {

      case "razorpay":

        return new RazorpayAdapter(
          credentials
        );

      case "stripe":

        return new StripeAdapter(
          credentials
        );

      default:

        throw new Error(
          "Unsupported payment gateway"
        );
    }
  }
}

export default PaymentFactory;