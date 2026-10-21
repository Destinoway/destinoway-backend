
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

export const cancelHotelBookingController = async (req, res) => {
  const correlationId = randomUUID();
  const bookingId = String(req.params.bookingId);
  try {
    logHotelEvent("info", "hotel.booking.cancellation.request_started", {
      correlationId,
      bookingId,
    });
    const data = await cancelHotelBooking({
      bookingId,
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
      bookingId,
      statusCode: error.statusCode ?? null,
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return sendError(res, error.message, error.statusCode ?? 500);
  }
};