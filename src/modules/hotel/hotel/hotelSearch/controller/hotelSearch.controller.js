import { asyncHandler } from "../../../../../middleware/asyncHandler.js";

import {
  sendSuccess,
  sendError,
} from "../../../../../utils/response/ApiResponse.js";

import {
  searchHotels,
} from "../service/hotelSearch.service.js";

export const searchHotelsController = asyncHandler(
  async (req, res) => {
    try {
      const result = await searchHotels(
        req.body
      );

      return sendSuccess(
        res,
        result,
        "Hotel search started successfully"
      );
    } catch (error) {
      console.error(
        "❌ HOTEL SEARCH ERROR:",
        error
      );

      return sendError(
        res,
        error.message ||
          "Hotel search failed"
      );
    }
  }
);