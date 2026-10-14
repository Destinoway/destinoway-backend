import { verifyHotelPrice } from "../services/hotelPriceVerify.service.js";

export const hotelPriceVerifyController = async (req, res) => {
  try {
    const data = await verifyHotelPrice({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
      recommendationId: req.body.recommendationId,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel pricing fetched successfully",
      data,
      meta: null,
    });
  } catch (error) {
    console.error("Hotel price verification error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to verify hotel price",
      data: null,
      meta: null,
    });
  }
};
