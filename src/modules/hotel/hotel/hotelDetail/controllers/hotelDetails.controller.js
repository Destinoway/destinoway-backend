import { getHotelDetails } from "../services/hotelDetails.service.js";

export const hotelDetailsController = async (req, res) => {
  try {
    const data = await getHotelDetails({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel details fetched successfully",
      data,
      meta: null,
    });
  } catch (error) {
    console.error("Hotel details error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hotel details",
      data: null,
      meta: null,
    });
  }
};