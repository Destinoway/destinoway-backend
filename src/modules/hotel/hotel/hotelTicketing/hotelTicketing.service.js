import axios from "axios";
import { getAuthHeader } from "../../../config/supplierApi.js";

export const hotelTicketingService = async ({
  bookingRefNo,
  searchKey,
}) => {

  try {

    if (!bookingRefNo) {
      throw new Error(
        "BookingRefNo is required"
      );
    }

    if (!searchKey) {
      throw new Error(
        "SearchKey is required"
      );
    }

    const payload = {
      AuthHeader: getAuthHeader().AuthHeader,

      BookingRefNo: bookingRefNo,

      // CorporateFlag: "1",

      // PaymentMode: "1",

      SearchKey: searchKey,
    };



    const response = await axios.post(
      "http://uat.flyshop.in/HotelHost/HotelNewAPIService.svc/JSONService/HotelTicketing",
      payload
    );



    return response.data;

  } catch (error) {



    throw new Error(
      error?.response?.data?.Message ||
      error?.response?.data?.ErrorMessage ||
      "Hotel ticketing failed"
    );
  }
};