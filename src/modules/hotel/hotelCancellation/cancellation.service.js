import HotelTempBooking from "../hotelTempBooking/hotelTempBooking.model.js";
import { supplierAPI } from "../../../config/supplierApi.js";
import { getAuthHeader } from "../../../config/supplierAuth.service.js";

export const cancelHotelService = async ({
  bookingRefNo,
}) => {
  try {
    const payload = {
      ...getAuthHeader(),
      BookingRefNo: bookingRefNo,
    };

    const { data } = await supplierAPI.post(
      "/JSONService/HotelCancellation",
      payload
    );

    const statusId = data?.ResponseHeader?.StatusId;

    if (statusId === "11") {
      await HotelTempBooking.findOneAndUpdate(
  {
    "hotelRequeryResponse.BookingRefNo": bookingRefNo,
  },
  {
    $set: {
      "ticketStatusDesc": "Cancelled",
      "hotelRequeryResponse.ticketStatusDesc":"Cancelled",
      "hotelRequeryResponse.TicketStatusDesc":"Cancelled",
     //"hotelRequeryResponse.ticketStatusId": "11",
      cancellationStatus: true,
      cancelledAt: new Date(),
      cancellationResponse: data,
    },
  },
  { new: true }
);
    }

    return data;
  } catch (error) {
    console.error(
      "Hotel Cancellation Error:",
      error?.response?.data || error.message
    );
    throw error;
  }
};