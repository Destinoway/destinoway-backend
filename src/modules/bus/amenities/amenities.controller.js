import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { getBusAmenitiesService } from "./amenities.service.js";

export const getBusAmenities = asyncHandler(async (req, res) => {
  const result = await getBusAmenitiesService({
    tui: req.body.tui.trim(),
    busServiceId: req.body.busServiceId.trim(),
  });
  return sendSuccess(res, "Bus amenities fetched successfully", result);
});
