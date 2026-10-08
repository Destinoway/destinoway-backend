import { asyncHandler } from "../../../../../middleware/asyncHandler.js";

import {
  sendSuccess,
  sendError,
} from "../../../../../utils/response/ApiResponse.js";

import {
  searchHotels,
} from "../service/hotelSearch.service.js";


export const searchHotelsController =
  asyncHandler(
    async (req, res) => {

      try {

        const userId =
          req.user?.id ||
          req.user?._id ||
          req.user?.userId;


        const result =
          await searchHotels({
            payload: req.body,
            userId,
          });


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