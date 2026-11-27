
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
    const message =
      Array.isArray(data) && data.length === 0
        ? "Booking does not exist"
        : "Hotel requery fetched successfully";

    if (Array.isArray(data) && data.length === 0) {
      return res.status(200).json({
        success: true,
        message,
        meta: null,
      });
    }

    return sendSuccess(
      res,
      message,
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
    return sendError(res, error.message, error.statusCode ?? 500);
  }
};
