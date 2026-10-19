

import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";
import { getHotelBookingDetailsByUserService } from "./requery.service.js";


export const getHotelRequeryByUserController = async (req, res) => {
  try {
    const bookingId = req.params.bookingId ?? req.query.bookingId;
    const data = await getHotelBookingDetailsByUserService(
      req.user._id,
      bookingId
    );

    return sendSuccess(
      res,
      "Hotel requery fetched successfully",
      data,
      null,
      200
    );
  } catch (error) {
    return sendError(res, error.message, error.statusCode ?? 500);
  }
};