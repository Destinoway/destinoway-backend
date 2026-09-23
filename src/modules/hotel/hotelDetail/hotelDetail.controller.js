
import {
  getHotelDetailService,getRoomPricingService 
} from "./hotelDetail.service.js";

import {
  sendSuccess,
  sendError,
} from "../../../utils/response/ApiResponse.js";


// ============================================================
// HOTEL DETAIL CONTROLLER
// ============================================================

export const getHotelDetail = async (req, res) => {
  try {

    const {
      hotelDetailId,
      hotelId,
    } = req.body || {};


    // ========================================================
    // VALIDATION
    // ========================================================

    if (!hotelDetailId) {
      return sendError(
        res,
        "hotelDetailId is required",
        400
      );
    }

    if (!hotelId) {
      return sendError(
        res,
        "hotelId is required",
        400
      );
    }


    // ========================================================
    // SERVICE
    // ========================================================

    const result =
      await getHotelDetailService({
        hotelDetailId,
        hotelId,
      });


    // ========================================================
    // SUCCESS
    // ========================================================

    return sendSuccess(
      res,
      "Hotel details fetched successfully",
      result
    );

  } catch (error) {

    console.error(
      "HOTEL DETAIL CONTROLLER ERROR:",
      error
    );

    return sendError(
      res,
      error?.message ||
        "Failed to fetch hotel details",
      500
    );
  }
};

export const getRoomPricing = async (req, res) => {
  try {
    const { hotelDetailId, roomId } = req.body || {};

    if (!hotelDetailId) {
      return sendError(
        res,
        "hotelDetailId is required",
        400
      );
    }

    if (!roomId) {
      return sendError(
        res,
        "roomId is required",
        400
      );
    }

    const result = await getRoomPricingService({
      hotelDetailId,
      roomId,
    });

    return sendSuccess(
      res,
      "Room pricing fetched successfully",
      result
    );
  } catch (error) {
    console.error(
      "GET ROOM PRICING ERROR:",
      error
    );

    return sendError(
      res,
      error?.message || "Failed to fetch room pricing",
      500
    );
  }
};