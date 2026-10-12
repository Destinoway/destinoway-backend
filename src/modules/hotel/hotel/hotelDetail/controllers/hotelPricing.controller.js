import { getHotelPricing } from "../services/hotelPricing.service.js";

export const hotelPricingController = async (req, res) => {
  try {
    const data = await getHotelPricing({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
      providerName: req.body.providerName,
      recommendationId: req.body.recommendationId,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel pricing fetched successfully",
      data,
      meta: null,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hotel pricing",
      data: null,
      meta: null,
    });
  }
};