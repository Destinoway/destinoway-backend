import mongoose from "mongoose";
import HotelItinerary from "../itinerary/hotelItinerary.model.js";

export const getHotelRequeryByUserService = async (
  userId,
  bookingRefNo,
  status,
  bookingId
) => {
  const query = { userId };

  if (bookingId) {
    if (!mongoose.isValidObjectId(bookingId)) {
      const error = new Error("Invalid booking ID");
      error.statusCode = 400;
      throw error;
    }
    query._id = bookingId;
  }

  if (bookingRefNo) {
    query.$or = [
      { transactionId: bookingRefNo },
      { "supplierBookingDetails.bookingConfirmationId": bookingRefNo },
      { "supplierBookingDetails.confirmationNumber": bookingRefNo },
    ];
  }

  if (status) {
    query.supplierBookingStatus = status;
  }

  const bookings = await HotelItinerary.find(query)
    .sort({ createdAt: -1 })
    .lean();

  if (!bookings.length) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const response = bookings.map((booking) => {
    const details = booking.supplierBookingDetails ?? {};

    return {
      hotelName: booking.hotel?.name ?? null,
      status:
        details.bookingStatus ?? booking.supplierBookingStatus ?? null,
      starRating: booking.hotel?.starRating ?? null,
      bookingRefNo: String(booking._id),
      checkInDate: booking.stay?.checkIn ?? null,
      checkOutDate: booking.stay?.checkOut ?? null,
      address: booking.hotel?.address ?? null,
      confirmationNumber: details.confirmationNumber ?? null,
    };
  });

  return bookingId || bookingRefNo ? response[0] : response;
};

export const getHotelBookingByUserService = async (userId, bookingId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    const error = new Error("Valid bookingId is required");
    error.statusCode = 400;
    throw error;
  }

  const booking = await HotelItinerary.findOne({
    _id: bookingId,
    userId,
  })
    .select("-__v -itineraryResponse -supplierBookingResponse")
    .lean();

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  return booking;
};
