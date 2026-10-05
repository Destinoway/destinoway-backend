

import {
  sendError,
  sendSuccess,
} from "../../../utils/response/ApiResponse.js";
 import { getHotelRequeryByUserService } from "./requery.service.js";


export const getHotelRequeryByUserController = async (req, res) => {
  try {
    const userId = req.user._id;
   const { bookingRefNo, status } = req.query;

const data = await getHotelRequeryByUserService(
  req.user._id,
  bookingRefNo,
  status
);

    return sendSuccess(
      res,
      "Hotel requery fetched successfully",
      data,
      null,
      200
    );
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};