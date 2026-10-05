
import { supplierAPI } from "../../../config/supplierApi.js";
import { getAuthHeader } from "../../../config/supplierAuth.service.js";
import HotelTempBooking from "../hotelTempBooking/hotelTempBooking.model.js";

export const hotelTempBookingService = async (payload) => {
  const requestStartTime = Date.now();

  try {
    console.log("======================================");
    console.log("🏨 HOTEL TEMP BOOKING STARTED");
    console.log("======================================");

    console.log("📥 Incoming Payload =>");
    console.log(JSON.stringify(payload, null, 2));

    // ✅ PREPARE REQUEST BODY
    const requestBody = {
      ...getAuthHeader(),
      ...payload,
    };

    console.log("======================================");
    console.log("📡 SUPPLIER REQUEST BODY =>");
    console.log(JSON.stringify(requestBody, null, 2));


    const dbRecord = await HotelTempBooking.create({
  requestPayload: requestBody,
  hotelKey: payload.HotelKey,
  UserId: payload.UserId,
  recommendationId: payload.RecommendationID,
  customerMobile: payload.CustomerMobile,
  status: "FAILED",
});

    console.log("======================================");
    console.log("💾 REQUEST SAVED IN DB");
    console.log("🆔 DB Record ID =>", dbRecord._id);

    // ✅ SUPPLIER API CALL
    const response = await supplierAPI.post(
      "/JSONService/HotelTempBooking",
      requestBody,
    );

    const responseTime = Date.now() - requestStartTime;

    console.log("======================================");
    console.log("✅ SUPPLIER RESPONSE RECEIVED");
    console.log("⏱ Response Time =>", `${responseTime} ms`);

    console.log("======================================");
    console.log("✅ COMPLETE SUPPLIER RESPONSE");
    console.log("======================================");

    console.log("📊 STATUS =>", response.status);
    console.log("📊 STATUS TEXT =>", response.statusText);

    console.log("======================================");
    console.log("📦 HEADERS =>");
    console.log(JSON.stringify(response.headers, null, 2));

    console.log("======================================");
    console.log("📦 RESPONSE DATA TYPE =>");
    console.log(typeof response.data);

    console.log("======================================");
    console.log("📦 RAW RESPONSE DATA =>");
    console.log(response.data);

    console.log("======================================");
    console.log("📦 FORMATTED RESPONSE DATA =>");
    console.log(JSON.stringify(response.data, null, 2));

    console.log("======================================");

    // ✅ UPDATE DB SUCCESS
    dbRecord.responsePayload = response.data;
    dbRecord.status = "SUCCESS";
    dbRecord.responseTime = responseTime;

    await dbRecord.save();

    console.log("======================================");
    console.log("💾 DB UPDATED SUCCESSFULLY");
    console.log("======================================");

    return response.data;
  } catch (error) {
    const responseTime = Date.now() - requestStartTime;

    console.log("======================================");
    console.log("❌ HOTEL TEMP BOOKING FAILED");
    console.log("⏱ Failed After =>", `${responseTime} ms`);

    console.log("🚨 ERROR =>");
    console.log(
      JSON.stringify(error?.response?.data || error.message, null, 2),
    );

    // ✅ SAVE FAILED REQUEST
    await HotelTempBooking.create({
      requestPayload: payload,
      status: "FAILED",
      responseTime,
      errorMessage: JSON.stringify(error?.response?.data || error.message),
    });

    console.log("======================================");
    console.log("💾 FAILED REQUEST SAVED");
    console.log("======================================");

    throw error;
  }
};
