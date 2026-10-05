
import HotelCart from "../hotelTempBooking/hotelCart.model.js";

export const getHotelRequeryByUserService = async (
  userId,
  bookingRefNo,
  status,
) => {
  // ===================================
  // Base Query
  // ===================================

  const query = {
    userId,
    "supplierResponse.hotelRequeryResponse": { $exists: true },
  };

  if (bookingRefNo) {
    query["supplierResponse.hotelRequeryResponse.BookingRefNo"] = bookingRefNo;
  }

  if (status) {
    query["supplierResponse.hotelRequeryResponse.TicketStatusDesc"] = status;
  }

  const bookings = await HotelCart.find(query).sort({
    createdAt: -1,
  });
console.log("Booking =",bookings)
  if (!bookings.length) {
    throw new Error("Booking not found");
  }

  const response = bookings.map((booking) => {
    const requery = booking.supplierResponse?.hotelRequeryResponse || {};

    return {
      _id: booking._id,

      pricing: {
        baseAmount:
          (booking.pricing?.finalPrice || 0) -
          (booking.pricing?.platformFeeAndTax || 0),

        serviceCharge: booking.pricing?.serviceCharge,

        platformFeeAndTax: booking.pricing?.platformFeeAndTax,

        finalPrice: booking.pricing?.finalPrice,
      },
   guestDetails:{
    customerName:booking.supplierData?.customerName,
       customerMobile:booking.supplierData?.customerMobile,
          customerAddress:booking.supplierData?.customerAddress,
           customerPostalCode:booking.supplierData?.customerPostalCode,
        occupants:
    booking.supplierData?.occupantDetails?.map((guest) => ({
      title: guest.Title,
      firstName: guest.FirstName,
      lastName: guest.LastName,
      occupantType: guest.OccupantType,
      OccupantID: guest.OccupantID,
      RoomNo: guest.RoomNo,
    })) || [],


   },
      offer: booking.offer,

      payableAmount: booking.payableAmount,
      bookingRefNo: booking.supplierResponse?.bookingRefNo,

      paymentStatus: booking.paymentStatus,

      createdAt: booking.createdAt,

      ticketStatusDesc: requery.TicketStatusDesc,

      checkInDate: requery.CheckInDate,

      checkOutDate: requery.CheckOutDate,

      voucherNumber: requery.VoucherNumber,

      supplierResponse: {
        CancellationPolicy: requery.CancellationPolicy,

        HotelDetails: requery.HotelDetails,

        HotelRoomDetail: requery.HotelRoomDetail,
      },
    };
  });

  // Single Booking
  if (bookingRefNo) {
    return response[0];
  }

  // Booking List
  return response;
};
