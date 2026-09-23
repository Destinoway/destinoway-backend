import { createOrderService, verifyPaymentService } from "./payment.service.js";

// export const createOrderController = async (req, res, next) => {
//   try {
//     const result = await createOrderService(req.body);

//     return res.status(200).json({
//       success: true,
//       message: "Order created successfully",
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
export const createOrderController = async (req, res, next) => {
  try {
    const result = await createOrderService({
      tempBookingId: req.body.tempBookingId,
      userId: req.user._id, // token se
    });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const verifyPaymentController = async (req, res, next) => {
  try {
    const result = await verifyPaymentService({
      ...req.body,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

import { paymentWebhookService } from "./payment.webhook.service.js";

export const paymentWebhookController = async (
  req,
  res,
  next
) => {
  try {
    await paymentWebhookService(req);

    return res.status(200).json({
      success: true,
    });

  } catch (error) {
    next(error);
  }
};