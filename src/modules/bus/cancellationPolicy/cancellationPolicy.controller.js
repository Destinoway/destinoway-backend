import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { getBusCancellationPolicyService } from "./cancellationPolicy.service.js";

export const getBusCancellationPolicy = asyncHandler(async (req, res) => {
  const result = await getBusCancellationPolicyService({
    tui: req.body.tui.trim(),
    busServiceId: req.body.busServiceId,
  });
  return sendSuccess(res, "Bus cancellation policy fetched successfully", result);
});
