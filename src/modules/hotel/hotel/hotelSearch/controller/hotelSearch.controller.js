import crypto from "crypto";

import { asyncHandler } from "../../../../../middleware/asyncHandler.js";

import {
  sendSuccess,
  sendError,
} from "../../../../../utils/response/ApiResponse.js";

import {
  searchHotels,
} from "../service/hotelSearch.service.js";


// =========================================================
// HOTEL SEARCH
// =========================================================

export const searchHotelsController =
  asyncHandler(async (req, res) => {
    try {
      // =====================================================
      // GET ANONYMOUS SEARCH SESSION ID
      // =====================================================

      let searchSessionId =
        req.headers[
          "x-search-session-id"
        ];

      // Express header can technically be an array
      if (Array.isArray(searchSessionId)) {
        searchSessionId =
          searchSessionId[0];
      }

      // =====================================================
      // IF FIRST SEARCH → CREATE SESSION ID
      // =====================================================

      if (!searchSessionId) {
        searchSessionId =
          crypto.randomUUID();
      }

      // =====================================================
      // START SEARCH
      // =====================================================

      const result =
        await searchHotels({
          payload: req.body,
          searchSessionId,
        });

      // Send session ID back to frontend
      // so it can reuse it for next search.
      res.setHeader(
        "X-Search-Session-Id",
        searchSessionId
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
  });