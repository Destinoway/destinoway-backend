import RazorpayAdapter
from "./razorpay.adapter.js";

import StripeAdapter
from "./stripe.adapter.js";

class PaymentFactory {

 static create(
  gatewayName
 ){

   if(
    gatewayName ===
    "razorpay"
   ){

      return new
      RazorpayAdapter();
   }

   if(
    gatewayName ===
    "stripe"
   ){

      return new
      StripeAdapter();
   }

   throw new Error(
    "Invalid gateway"
   );
 }
}

export default
 PaymentFactory;