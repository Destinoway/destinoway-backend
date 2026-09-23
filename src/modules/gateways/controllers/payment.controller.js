import * as PaymentService from "../services/payment.service.js";
import {refundPayment} from "../services/refund.service.js";


export const createOrder = async (req, res, next) => {
  try {
    const result = await PaymentService.createOrder({
      bookingId: req.body.bookingId,

      amount: req.body.amount,

      currency: req.body.currency,

      userId: req.user.id,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const result = await PaymentService.verifyPayment({
      transactionId: req.body.transactionId,

      paymentId: req.body.paymentId,

      paymentIntentId: req.body.paymentIntentId,

      orderId: req.body.orderId,

      signature: req.body.signature,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



export const refund =
 async (
   req,
   res
 ) => {

   const result =

    await refundPayment({

      transactionId:

       req.body
       .transactionId,

      amount:

       req.body
       .amount
    });

   return res.json({

      success:true,

      data:result
   });
};