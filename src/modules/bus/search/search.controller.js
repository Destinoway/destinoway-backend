import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { startBusSearchService, getBusSearchService } from "./search.service.js";

export const startBusSearch = asyncHandler(async (req, res) => {
  const { from, to, onward } = req.body;
  const result = await startBusSearchService({ from: from.trim(), to: to.trim(), onward });
  return sendSuccess(res, "Bus search started", result);
});

export const getBusSearchResults = asyncHandler(async (req, res) => {
  const result = await getBusSearchService(req.body.tui.trim());
  return sendSuccess(res, result.completed ? "Bus search completed" : "Bus search in progress", result);
});
