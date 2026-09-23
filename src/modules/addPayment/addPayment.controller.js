

import { addPaymentService } from "./addPayment.service.js";
import {
  sendSuccess,
  sendError,
} from "../../utils/response/ApiResponse.js";

export const addPaymentController = async (req, res) => {
  try {
    console.log("\n================ ADD PAYMENT =================");
    console.log("📥 Request Body:");
    console.log(JSON.stringify(req.body, null, 2));

    const result = await addPaymentService(req.body);

    console.log("✅ Payment Success:");
    console.log(JSON.stringify(result, null, 2));

    console.log("=============================================\n");

    return sendSuccess(
      res,
      "Payment added successfully",
      result,
      null,
      200
    );
  } catch (error) {
    console.error("❌ Add Payment Controller Error:");
    console.error(error);

    return sendError(
      res,
      error.message || "Payment failed",
      500
    );
  }
};