import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { getBusSeatLayoutService } from "./seatLayout.service.js";

export const getBusSeatLayout = asyncHandler(async (req, res) => {
  const { tui, busServiceId, journeyDate, providerCode } = req.body;
  const result = await getBusSeatLayoutService({
    tui: tui.trim(),
    busServiceId: busServiceId.trim(),
    journeyDate,
    providerCode: providerCode.trim(),
  });
  return sendSuccess(res, "Bus seat layout fetched successfully", result);
});
