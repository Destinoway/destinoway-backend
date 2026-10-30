

import { addPaymentService } from "./addPayment.service.js";
import {
  sendSuccess,
  sendError,
} from "../../utils/response/ApiResponse.js";

export const addPaymentController = async (req, res) => {
  try {

    const result = await addPaymentService(req.body);



    return sendSuccess(
      res,
      "Payment added successfully",
      result,
      null,
      200
    );
  } catch (error) {

    return sendError(
      res,
      error.message || "Payment failed",
      500
    );
  }
};