import {
  createTempBookingService,
} from "./tempBooking.service.js";

export const createTempBooking = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await createTempBookingService(
        req.body
      );

    return res.status(200).json({
      success: true,

      message:
        "Hotel temporary booking created successfully",

      data: result,
    });
  } catch (error) {
    next(error);
  }
};