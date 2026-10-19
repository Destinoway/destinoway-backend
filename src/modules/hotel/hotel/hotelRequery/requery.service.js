import HotelItinerary from "../itinerary/hotelItinerary.model.js";

export const getHotelRequeryByUserService = async (
  userId,
  bookingRefNo,
  status
) => {
  const query = { userId };

  if (bookingRefNo) {
    query.transactionId = bookingRefNo;
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
    const contactInfo = booking.contactInfo ?? {};
    const total = booking.price?.total ?? null;
    const rooms = (booking.rooms ?? []).map((room) => ({
      occupancyId: room.occupancyId,
      adults: (room.adults ?? []).map((guest) => ({
        title: guest.title,
        firstName: guest.firstName,
        middleName: guest.middleName,
        lastName: guest.lastName,
      })),
      children: (room.children ?? []).map((guest) => ({
        title: guest.title,
        firstName: guest.firstName,
        middleName: guest.middleName,
        lastName: guest.lastName,
        age: guest.age,
      })),
    }));

    return {
      _id: booking._id,
      bookingRefNo: booking.transactionId,
      itineraryStatus: booking.itineraryStatus,
      paymentStatus: booking.paymentStatus,
      supplierBookingStatus: booking.supplierBookingStatus,
      createdAt: booking.createdAt,
      pricing: {
        baseAmount: total,
        serviceCharge: null,
        platformFeeAndTax: null,
        finalPrice: total,
        currency: booking.price?.currency ?? null,
      },
      guestDetails: {
        customerName: [contactInfo.firstName, contactInfo.lastName]
          .filter(Boolean)
          .join(" "),
        customerMobile: contactInfo.mobile ?? null,
        customerAddress: contactInfo.address ?? null,
        customerPostalCode: contactInfo.pin ?? null,
        occupants: [
          ...rooms.flatMap((room) =>
            room.adults.map((guest) => ({
              title: guest.title,
              firstName: guest.firstName,
              lastName: guest.lastName,
              occupantType: "adult",
            }))
          ),
          ...rooms.flatMap((room) =>
            room.children.map((guest) => ({
              title: guest.title,
              firstName: guest.firstName,
              lastName: guest.lastName,
              occupantType: "child",
            }))
          ),
        ],
      },
      payableAmount: total,
      ticketStatusDesc:
        booking.supplierBookingDetails?.bookingStatus ??
        booking.supplierBookingStatus ??
        null,
      checkInDate: booking.stay?.checkIn ?? null,
      checkOutDate: booking.stay?.checkOut ?? null,
      voucherNumber: booking.supplierBookingDetails?.voucherNumber ?? null,
      supplierBookingDetails: booking.supplierBookingDetails ?? null,
      supplierResponse: {
        CancellationPolicy: null,
        HotelDetails: booking.hotel,
        HotelRoomDetail: rooms,
      },
    };
  });

  return bookingRefNo ? response[0] : response;
};
