// import axios from "axios";

// export const getHotelDetailAPI = async (
//   supplierPayload
// ) => {
//   try {
//     console.log(
//       "=========================================="
//     );
//     console.log(
//       "FLYSHOP HOTEL DETAIL API"
//     );
//     console.log(
//       "Payload:",
//       supplierPayload
//     );
//     console.log(
//       "=========================================="
//     );

//     const response = await axios.post(
//       `${process.env.FLYSHOP_URL}/HotelDetails`,
//       supplierPayload,
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//         timeout: 30000,
//       }
//     );

//     console.log(
//       "=========================================="
//     );
//     console.log(
//       "FLYSHOP HOTEL DETAIL RESPONSE"
//     );
//     console.log(
//       "Status:",
//       response.status
//     );
//     console.log(
//       "Response:",
//       response.data
//     );
//     console.log(
//       "=========================================="
//     );

//     return response.data;

//   } catch (error) {
//     console.error(
//       "=========================================="
//     );

//     console.error(
//       "FLYSHOP HOTEL DETAIL API ERROR"
//     );

//     console.error(
//       "Message:",
//       error?.message
//     );

//     console.error(
//       "Status:",
//       error?.response?.status
//     );

//     console.error(
//       "Response:",
//       error?.response?.data
//     );

//     console.error(
//       "=========================================="
//     );

//     throw error;
//   }
// };


import {
  supplierAPI,
  getAuthHeader,
} from "../../../../config/supplierApi.js";

// =====================================================
// HOTEL SEARCH
// =====================================================


// =====================================================
// HOTEL Detail
// =====================================================

export const getHotelDetailAPI = async (payload) => {
  const supplierPayload = {
    ...getAuthHeader(),
    ...payload,
  };

  const { data } = await supplierAPI.post(
    "/HotelDetails",
    supplierPayload
  );

  return data;
};