
import { supplierAPI } from "../../../config/supplierApi.js";
import { getAuthHeader } from "../../../config/supplierAuth.service.js";
import HotelTempBooking from "../hotelTempBooking/hotelTempBooking.model.js";

export const hotelTempBookingService = async (payload) => {
  const requestStartTime = Date.now();

  try {


    // ✅ PREPARE REQUEST BODY
    const requestBody = {
      ...getAuthHeader(),
      ...payload,
    };



    const dbRecord = await HotelTempBooking.create({
  requestPayload: requestBody,
  hotelKey: payload.HotelKey,
  UserId: payload.UserId,
  recommendationId: payload.RecommendationID,
  customerMobile: payload.CustomerMobile,
  status: "FAILED",
});


    // ✅ SUPPLIER API CALL
    const response = await supplierAPI.post(
      "/JSONService/HotelTempBooking",
      requestBody,
    );

    const responseTime = Date.now() - requestStartTime;









    // ✅ UPDATE DB SUCCESS
    dbRecord.responsePayload = response.data;
    dbRecord.status = "SUCCESS";
    dbRecord.responseTime = responseTime;

    await dbRecord.save();


    return response.data;
  } catch (error) {
    const responseTime = Date.now() - requestStartTime;



    // ✅ SAVE FAILED REQUEST
    await HotelTempBooking.create({
      requestPayload: payload,
      status: "FAILED",
      responseTime,
      errorMessage: JSON.stringify(error?.response?.data || error.message),
    });


    throw error;
  }
};
