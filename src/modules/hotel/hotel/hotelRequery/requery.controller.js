

import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";
import {
  getHotelBookingByUserService,
  getHotelRequeryByUserService,
} from "./requery.service.js";


export const getHotelRequeryByUserController = async (req, res) => {
  try {
    const bookingId = req.params.bookingId ?? req.query.bookingId;
    const data = bookingId
      ? await getHotelBookingByUserService(req.user._id, bookingId)
      : await getHotelRequeryByUserService(
          req.user._id,
          req.query.bookingRefNo,
          req.query.status
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