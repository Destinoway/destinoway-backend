import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { createPaymentGatewayConfig } from "../services/paymentGateway.service.js";

export const createPaymentGatewayConfigController = asyncHandler(async (req, res) => {
  const gateway = await createPaymentGatewayConfig(req.body);
  return sendSuccess(res, "Payment gateway configuration created", gateway, null, 201);
});
