import {
  confirmHotelBookingService,
} from "./hotelBooking.service.js";

export const confirmHotelBookingController =
  async (req, res, next) => {

    try {

      const {
        refNo,
      } = req.body;

      const result =
        await confirmHotelBookingService({
          refNo,
        });

      return res.status(200).json({

        success: true,

        message:
          "Hotel booking confirmed successfully",

        data: result,

      });

    } catch (error) {

      next(error);

    }
  };