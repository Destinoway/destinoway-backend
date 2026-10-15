import { createHotelItinerary } from "./hotelItinerary.service.js";

export const createHotelItineraryController = async (req, res, next) => {
  try {
    const data = await createHotelItinerary({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
      recommendationId: req.body.recommendationId,
      contactInfo: req.body.contactInfo,
      rooms: req.body.rooms,
      specialServiceRequest: req.body.specialServiceRequest ?? "",
      userId: req.user?._id ?? null,
    });

    return res.status(201).json({
      success: true,
      message: "Hotel itinerary created successfully; payment is pending",
      data,
      meta: null,
    });
  } catch (error) {
    return next(error);
  }
};
