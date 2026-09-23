import PaymentTransaction
from "../models/paymentTransaction.model.js";

import PaymentFactory
from "../adapters/payment.factory.js";

export const refundPayment =
 async ({
   transactionId,
   amount
 }) => {

   const transaction =

    await PaymentTransaction
    .findOne({

      transactionId
    });

   if(!transaction){

      throw new Error(
        "Transaction not found"
      );
   }

   /*
      only successful payment
   */

   if(

    transaction.status !==
    "success"
   ){

      throw new Error(
       "Refund not allowed"
      );
   }

   /*
      create gateway adapter
   */

   const gateway =

    PaymentFactory
    .create(
      transaction.gateway
    );

   /*
      call refund api
   */

   const refund =

    await gateway
    .refundPayment({

      paymentId:

       transaction
       .gatewayPaymentId,

      amount
    });

   /*
      update db
   */

   transaction.status =
    "refunded";

   transaction.refundAmount =
    amount;

   transaction.refundedAt =
    new Date();

   await transaction.save();

   return refund;
};