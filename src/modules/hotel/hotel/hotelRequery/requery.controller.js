
import { randomUUID } from "node:crypto";
import {
  sendError,
  sendSuccess,
} from "../../../../utils/response/ApiResponse.js";
import {
  getHotelBookingByUserService,
  getHotelRequeryByUserService,
} from "./requery.service.js";
import { cancelHotelBooking } from "../payments/hotelPayment.service.js";
import { logHotelEvent } from "../utils/hotelObservability.js";


export const getHotelRequeryByUserController = async (req, res) => {
  try {
    const bookingRefNo = req.params.bookingRefNo ?? req.query.bookingRefNo;
    const data = bookingRefNo
      ? await getHotelBookingByUserService(req.user._id, bookingRefNo)
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

export const cancelHotelBookingController = async (req, res) => {
  const correlationId = randomUUID();
  const bookingRefNo = String(req.params.bookingRefNo);
  try {
    logHotelEvent("info", "hotel.booking.cancellation.request_started", {
      correlationId,
      bookingRefNo,
    });
    const data = await cancelHotelBooking({
      bookingRefNo,
      userId: req.user._id,
      confirmCancellation: req.body?.confirmCancellation,
      remarks: req.body?.remarks,
      correlationId,
    });
    return sendSuccess(
      res,
      "Hotel cancellation request processed",
      data,
      null,
      200
    );
  } catch (error) {
    logHotelEvent("error", "hotel.booking.cancellation.request_failed", {
      correlationId,
      bookingRefNo,
      statusCode: error.statusCode ?? null,
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return sendError(res, error.message, error.statusCode ?? 500);
  }
};
