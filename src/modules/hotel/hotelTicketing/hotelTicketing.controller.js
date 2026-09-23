import { hotelTicketingService } from "./hotelTicketing.service.js";
import {
  sendSuccess,
  sendError,
} from "../../../utils/response/ApiResponse.js";

export const hotelTicketingController = async (
  req,
  res
) => {
  try {
    console.log("\n================ HOTEL TICKETING =================");
    console.log(
      JSON.stringify(req.body, null, 2)
    );

    const result = await hotelTicketingService(
      req.body
    );
    console.log("REQ BODY:", req.body);

    return sendSuccess(
      res,
      "Hotel ticketing successful",
      result,
      null,
      200
    );
  } catch (error) {
    console.error(
      "❌ Hotel Ticketing Controller Error:",
      error
    );

    return sendError(
      res,
      error.message || "Hotel ticketing failed",
      500
    );
  }
};