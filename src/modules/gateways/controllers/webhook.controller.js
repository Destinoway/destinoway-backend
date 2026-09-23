import PaymentTransaction
from "../models/paymentTransaction.model.js";

/*
 Razorpay webhook
*/
export const razorpayWebhook =
  async (req, res, next) => {

    try {

      const event =
        req.body.event;

      /*
        payment captured
      */
      if (
        event ===
        "payment.captured"
      ) {

        const payment =
          req.body
            .payload
            .payment
            .entity;

        await PaymentTransaction
          .findOneAndUpdate(

            {
              gatewayPaymentId:
                payment.id
            },

            {
              status: "success"
            }
          );
      }

      return res.status(200).json({
        ok: true
      });

    } catch (error) {

      next(error);
    }
  };


/*
 Stripe webhook
*/
export const stripeWebhook =
  async (req, res, next) => {

    try {

      const event =
        req.body.type;

      /*
        payment success
      */
      if (
        event ===
        "payment_intent.succeeded"
      ) {

        const paymentIntent =
          req.body
            .data
            .object;

        await PaymentTransaction
          .findOneAndUpdate(

            {
              gatewayPaymentId:
                paymentIntent.id
            },

            {
              status: "success"
            }
          );
      }

      return res.status(200).json({
        ok: true
      });

    } catch (error) {

      next(error);
    }
  };