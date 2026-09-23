
import { supplierAPI } from "../../../config/supplierApi.js";
import { getAuthHeader } from "../../../config/supplierAuth.service.js";

export const hotelTicketingService = async ({
  BookingRefNo,
  SearchKey,
}) => {
  try {
    // ==========================================
    // HOTEL TICKETING
    // ==========================================

    const ticketPayload = {
      AuthHeader: getAuthHeader().AuthHeader,
      BookingRefNo,
      SearchKey,
    };

    console.log("\n=========== HOTEL TICKETING REQUEST ===========");
    console.log(JSON.stringify(ticketPayload, null, 2));

    const ticketResponse = await supplierAPI.post(
      "/JSONService/HotelTicketing",
      ticketPayload
    );

    const ticketingData = ticketResponse.data;

    console.log("\n=========== HOTEL TICKETING RESPONSE ===========");
    console.log(JSON.stringify(ticketingData, null, 2));

    const statusId = ticketingData?.ResponseHeader?.StatusId;

    if (
      statusId !== "11" ||
      !ticketingData?.BookingRefNo ||
      !ticketingData?.HotelvoucherNumber
    ) {
      throw new Error(
        ticketingData?.ResponseHeader?.ErrorDesc ||
          "Hotel Ticketing Failed"
      );
    }

    // ==========================================
    // HOTEL REQUERY
    // ==========================================

    console.log("\n=========== HOTEL REQUERY REQUEST ===========");

    const requeryPayload = {
      AuthHeader: getAuthHeader().AuthHeader,
      BookingRefNo: ticketingData.BookingRefNo,
      HotelvoucherNumber: ticketingData.HotelvoucherNumber,
    };

    console.log(JSON.stringify(requeryPayload, null, 2));

    const requeryResponse = await supplierAPI.post(
      "/JSONService/HotelRequery",
      requeryPayload
    );

    const requeryData = requeryResponse.data;

    console.log("\n=========== HOTEL REQUERY RESPONSE ===========");
    console.log(JSON.stringify(requeryData, null, 2));

    // ==========================================
    // RETURN ONLY
    // ==========================================

    return {
      success: true,

      bookingRefNo: ticketingData.BookingRefNo,

      hotelVoucherNumber: ticketingData.HotelvoucherNumber,

      ticketingData,

      requeryData,
    };
  } catch (error) {
    console.error("\n=========== HOTEL TICKETING ERROR ===========");

    if (error?.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }

    throw new Error(
      error?.response?.data?.Message ||
        error?.response?.data?.ResponseHeader?.ErrorDesc ||
        error.message ||
        "Hotel Ticketing Failed"
    );
  }
};