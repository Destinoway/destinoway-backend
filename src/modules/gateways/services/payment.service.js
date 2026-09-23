import { v4 as uuid } from "uuid";

import PaymentGateway from "../models/paymentGateway.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import PaymentFactory from "../adapters/payment.factory.js";

/*
 Create payment order
*/
export const createOrder = async ({
  bookingId,
  amount,
  currency,
  userId
}) => {
  /*
   Prevent duplicate payment request
  */
  const existing = await PaymentTransaction.findOne({
    bookingId,
    status: "pending"
  });

  if (existing) {
    return {
      transaction: existing,
      paymentData: {
        message: "Pending transaction already exists"
      }
    };
  }

  /*
   Choose active gateway
  */
  const gatewayDoc = await PaymentGateway.findOne({
    isActive: true,
    supportedCurrencies: {
      $in: [currency]
    }
  }).sort({
    priority: 1
  });

  if (!gatewayDoc) {
    throw new Error("No payment gateway available");
  }

  /*
   Build gateway adapter
  */
  const gateway = PaymentFactory.create(
    gatewayDoc.name
  );

  /*
   Create payment order on gateway
  */
  const response = await gateway.createOrder({
    amount,
    currency
  });

  /*
   Save transaction
  */
  const transaction =
    await PaymentTransaction.create({
      transactionId: uuid(),

      bookingId,

      userId,

      gateway: gatewayDoc.name,

      amount,

      currency,

      gatewayOrderId:
        response.orderId ||
        response.paymentIntentId,

      status: "pending"
    });

  return {
    transaction,
    paymentData: response
  };
};



/*
 Verify payment
*/
export const verifyPayment = async (
  payload
) => {

  /*
    find transaction
  */
  const transaction =
    await PaymentTransaction.findOne({

      transactionId:
        payload.transactionId
    });

  if (!transaction) {
    throw new Error(
      "Invalid transaction"
    );
  }

  /*
    create adapter
  */
  const gateway =
    PaymentFactory.create(
      transaction.gateway
    );

  /*
    verify payment
  */
  const response =
    await gateway.verifyPayment(
      payload
    );

  /*
    update database
  */
  if (response.success) {

    transaction.status =
      "success";

    transaction.gatewayPaymentId =

      payload.paymentId ||

      payload.paymentIntentId;

  } else {

    transaction.status =
      "failed";
  }

  await transaction.save();

  return {
    success: response.success,
    status: transaction.status,
    transactionId:
      transaction.transactionId
  };
};