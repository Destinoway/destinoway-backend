import { asyncHandler } from "../../../../../middleware/asyncHandler.js";

import {
  sendSuccess,
  sendError,
} from "../../../../../utils/response/ApiResponse.js";

import {
  getHotelSearchResults,
} from "../service/hotelSearchResult.service.js";

export const getHotelSearchResultsController =
  asyncHandler(async (req, res) => {
    try {
      const {
        searchId,
      } = req.params;

      const {
        page = 1,
        limit = 20,
      } = req.query;

      const result =
        await getHotelSearchResults({
          searchId,
          page,
          limit,
        });

      return sendSuccess(
        res,
        result,
        "Hotel search results fetched successfully"
      );
    } catch (error) {
      console.error(
        "❌ HOTEL SEARCH RESULT ERROR:",
        error
      );

      return sendError(
        res,
        error.message ||
          "Unable to fetch hotel search results"
      );
    }
  });