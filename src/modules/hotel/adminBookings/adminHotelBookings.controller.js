import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { getAdminHotelBookings } from "./adminHotelBookings.service.js";

export const getAdminHotelBookingsController = asyncHandler(async (req, res) => {
  const result = await getAdminHotelBookings(req.query);
  return sendSuccess(
    res,
    "Hotel bookings fetched successfully",
    result.bookings,
    result.pagination,
  );
});
