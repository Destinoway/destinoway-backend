import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import {
  getAdminHotelBookingById,
  getAdminHotelBookings,
} from "./adminHotelBookings.service.js";

export const getAdminHotelBookingsController = asyncHandler(async (req, res) => {
  const result = await getAdminHotelBookings(req.query);
  return sendSuccess(
    res,
    "Hotel bookings fetched successfully",
    result.bookings,
    result.pagination,
  );
});

export const getAdminHotelBookingByIdController = asyncHandler(
  async (req, res) => {
    const booking = await getAdminHotelBookingById(req.params.bookingId);
    return sendSuccess(res, "Hotel booking fetched successfully", booking);
  },
);
