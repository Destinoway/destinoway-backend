import { searchHotelService } from "./search.service.js";

export const searchHotels = async (req, res) => {
  try {
    const data = await searchHotelService(req.body);

    return res.status(200).json({
      success: true,
      message: "Hotels fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Hotel Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search hotels",
    });
  }
};