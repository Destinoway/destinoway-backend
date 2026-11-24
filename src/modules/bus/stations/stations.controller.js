import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { getBusStationsService } from "./stations.service.js";

// POST /api/v1/bus/stations
// Body is already checked by validateBusStationsRequest.
export const getBusStations = asyncHandler(async (req, res) => {
  const { term = "", type, refresh = false } = req.body || {};

  const { stations, source } = await getBusStationsService({
    term,
    type: type ? String(type).toLowerCase() : undefined,
    refresh,
  });

  return sendSuccess(res, "Bus stations fetched successfully", stations, {
    count: stations.length,
    source,
  });
});
