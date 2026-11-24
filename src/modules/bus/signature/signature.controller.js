import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendError, sendSuccess } from "../../../utils/response/ApiResponse.js";
import {
  checkBusSignatureService,
  getBusHealthService,
} from "./signature.service.js";

// GET /api/v1/bus/signature/health
export const getBusHealth = (req, res) => {
  const result = getBusHealthService();

  return sendSuccess(res, "Bus module is running", result);
};

// GET /api/v1/bus/signature/check?refresh=true
// DEV ONLY: verifies the AKBAR bus token can be created/read.
export const checkBusSignature = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return sendError(res, "Not available", 404);
  }

  const result = await checkBusSignatureService({
    refresh: req.query.refresh === "true",
  });

  return sendSuccess(res, "AKBAR bus token OK", result);
});
