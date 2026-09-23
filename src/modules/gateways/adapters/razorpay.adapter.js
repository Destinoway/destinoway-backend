import crypto from "crypto";

import razorpay
from "../../../config/razorpay.config.js";

import BaseGateway
from "./base.adapter.js";

class RazorpayAdapter
extends BaseGateway {

 async createOrder(
   payload
 ){

   const order =
    await razorpay.orders
    .create({

      amount:
       payload.amount * 100,

      currency:
       payload.currency
    });

   return {

     orderId:
      order.id
   };
 }

 async verifyPayment(
   payload
 ){

   const body =

    payload.orderId

    +

    "|"

    +

    payload.paymentId;

   const expected =

    crypto
    .createHmac(

      "sha256",

      process.env
      .RAZORPAY_SECRET
    )

    .update(body)

    .digest("hex");

   return {

    success:

      expected ===
      payload.signature
   };
 }

 async refundPayment(
   payload
 ){

   const refund =
    await razorpay
    .payments
    .refund(

      payload.paymentId,

      {

       amount:
        payload.amount
        *100
      }
    );

   return refund;
 }
}

export default
 RazorpayAdapter;