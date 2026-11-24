import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { sendSuccess } from "../../../utils/response/ApiResponse.js";
import { createBusTravelItineraryService } from "./travelItinerary.service.js";

export const createBusTravelItinerary = asyncHandler(async (req, res) => {
  const { tui, busServiceId, seatName, buid, duid, passenger, contact } = req.body;
  const result = await createBusTravelItineraryService({
    tui: tui.trim(),
    busServiceId: busServiceId.trim(),
    seatName: seatName.trim(),
    buid,
    duid,
    passenger: { ...passenger, firstName: passenger.firstName.trim(), lastName: passenger.lastName.trim() },
    contact: { email: contact.email.trim(), phone: contact.phone },
    userId: req.user._id,
  });
  return sendSuccess(res, "Bus travel itinerary created", result);
});
