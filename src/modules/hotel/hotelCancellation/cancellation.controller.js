import { cancelHotelService } from "./cancellation.service.js";
import {
  sendSuccess,
  sendError,
} from "../../../utils/response/ApiResponse.js";

export const cancelHotelController = async (req, res) => {
  try {
    const { bookingRefNo } = req.body;

    const result = await cancelHotelService({
      bookingRefNo,
    });

    return sendSuccess(
      res,
      "Hotel cancellation processed",
      result
    );
  } catch (error) {
    return sendError(
      res,
      error.message || "Cancellation failed"
    );
  }
};
