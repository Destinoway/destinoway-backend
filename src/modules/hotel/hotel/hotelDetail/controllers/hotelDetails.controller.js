import { getHotelDetails } from "../services/hotelDetails.service.js";

export const hotelDetailsController = async (req, res) => {
  try {
    const data = await getHotelDetails({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel details fetched successfully",
      data,
      meta: null,
    });
  } catch (error) {

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hotel details",
      data: null,
      meta: null,
    });
  }
};