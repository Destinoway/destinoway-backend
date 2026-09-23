import stripe
from "../../../config/stripe.config.js";

import BaseGateway
from "./base.adapter.js";

class StripeAdapter
extends BaseGateway {

 async createOrder(
   payload
 ){

   const intent =

    await stripe
    .paymentIntents
    .create({

      amount:
       payload.amount
       *100,

      currency:
       payload.currency
    });

   return {

     clientSecret:
      intent.client_secret,

     paymentIntentId:
      intent.id
   };
 }

 async verifyPayment(
  payload
 ){

   const intent =

    await stripe
    .paymentIntents
    .retrieve(

      payload.paymentIntentId
    );

   return {

     success:

      intent.status ===
      "succeeded"
   };
 }

 async refundPayment(
  payload
 ){

   return await stripe
   .refunds.create({

     payment_intent:
      payload.paymentIntentId
   });
 }
}

export default
 StripeAdapter;