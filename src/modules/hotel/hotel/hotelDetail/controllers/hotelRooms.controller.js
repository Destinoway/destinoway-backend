import { getHotelRooms } from "../services/hotelRooms.service.js";

export const hotelRoomsController = async (req, res) => {
  try {
    const data = await getHotelRooms({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel rooms fetched successfully",
      data,
      meta: null,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hotel rooms",
      data: null,
      meta: null,
    });
  }
};