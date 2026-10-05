import {
  supplierAPI,
  getAuthHeader,
} from "../../../../../config/supplierApi.js";

import {
  mapFlyshopTempBookingRequest,
} from "./flyshopTempBooking.request.mapper.js";

import {
  mapFlyshopTempBookingResponse,
} from "./flyshopTempBooking.response.mapper.js";

// =====================================================
// HOTEL TEMP BOOKING
// =====================================================

// export const createTempBookingAPI = async (
//   payload
// ) => {
//   // ===================================================
//   // 1. MAP REQUEST
//   // ===================================================

//   const mappedPayload =
//     mapFlyshopTempBookingRequest(payload);

//   // ===================================================
//   // 2. ADD COMMON AUTH HEADER
//   // ===================================================

//   const supplierPayload = {
//     ...getAuthHeader(),
//     ...mappedPayload,
//   };

//   // ===================================================
//   // 3. CALL SUPPLIER API
//   // ===================================================

//   const { data } =
//     await supplierAPI.post(
//       "/HotelTempBooking",
//       supplierPayload
//     );

//   // ===================================================
//   // 4. MAP RESPONSE
//   // ===================================================

//   return mapFlyshopTempBookingResponse(
//     data
//   );
// };
export const createTempBookingAPI = async (payload) => {
  const mappedPayload =
    mapFlyshopTempBookingRequest(payload);

  const supplierPayload = {
    ...getAuthHeader(),
    ...mappedPayload,
  };

  console.log(
    "=========================================="
  );

  console.log(
    "FLYSHOP TEMP BOOKING REQUEST"
  );

  console.dir(
    supplierPayload,
    { depth: null }
  );

  console.log(
    "=========================================="
  );

  const { data } =
    await supplierAPI.post(
      "/HotelTempBooking",
      supplierPayload
    );

  return mapFlyshopTempBookingResponse(data);
};