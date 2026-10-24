import {
  createHotelItinerary,
  updateHotelItineraryCoupon,
} from "./hotelItinerary.service.js";

export const createHotelItineraryController = async (req, res, next) => {
  try {
    const data = await createHotelItinerary({
      searchId: req.params.searchId,
      hotelId: req.params.hotelId,
      recommendationId: req.body.recommendationId,
      contactInfo: req.body.contactInfo,
      rooms: req.body.rooms,
      specialServiceRequest: req.body.specialServiceRequest ?? "",
      itineraryId: req.body.itineraryId,
      userId: req.user._id,
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

export const updateHotelItineraryCouponController = async (req, res, next) => {
  try {
    const data = await updateHotelItineraryCoupon({
      itineraryId: req.params.itineraryId,
      userId: req.user._id,
      couponCode: req.body.couponCode ?? null,
    });
    return res.status(200).json({
      success: true,
      message: data.appliedCoupon ? "Coupon applied successfully" : "Coupon removed successfully",
      data,
      meta: null,
    });
  } catch (error) {
    return next(error);
  }
};
