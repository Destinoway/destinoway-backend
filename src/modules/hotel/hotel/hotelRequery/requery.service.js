import HotelItinerary from "../itinerary/hotelItinerary.model.js";

export const getHotelRequeryByUserService = async (
  userId,
  bookingRefNo,
  status
) => {
  const query = { userId };

  if (bookingRefNo) {
    query.$or = [
      { bookingRefNo },
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
      bookingRefNo: booking.bookingRefNo ?? null,
      checkInDate: booking.stay?.checkIn ?? null,
      checkOutDate: booking.stay?.checkOut ?? null,
      address: booking.hotel?.address ?? null,
      confirmationNumber: details.confirmationNumber ?? null,
    };
  });

  return bookingRefNo ? response[0] : response;
};

export const getHotelBookingByUserService = async (userId, bookingRefNo) => {
  const isBookingRefNo = /^DW-\d{4}-(0[1-9]|1[0-2])-\d{8}$/.test(bookingRefNo);
  if (!isBookingRefNo) {
    const error = new Error("Valid bookingRefNo is required");
    error.statusCode = 400;
    throw error;
  }

  const booking = await HotelItinerary.findOne({
    userId,
    bookingRefNo,
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
