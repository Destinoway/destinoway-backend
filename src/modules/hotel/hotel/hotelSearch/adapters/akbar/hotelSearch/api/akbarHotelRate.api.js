// import axios from "axios";
// import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

// export const akbarHotelRateAPI = async ({
//   searchId,
//   searchTracingKey,
// }) => {

//   console.log("========== AKBAR RATE API START ==========");

// console.log("Search ID:", searchId);
// console.log("Search Tracing Key:", searchTracingKey);
//   const token = await getAKBARToken();

//   console.log("AKBAR Token received:", !!token);

//   const response = await axios.get(
//     `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/rate`,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "search-tracing-key": searchTracingKey,
//       },

//       timeout: 30000,
//     }
//   );

//   return response.data;

// };

//   console.log("AKBAR RATE STATUS:", response.status);

// console.log(
//   "AKBAR RATE RESPONSE:",
//   JSON.stringify(response.data, null, 2)
// );

// console.log("========== AKBAR RATE API END ==========");

// import axios from "axios";
// import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

// export const akbarHotelRateAPI = async ({
//   searchId,
//   searchTracingKey,
// }) => {
//   console.log("========== AKBAR RATE API START ==========");

//   console.log("Search ID:", searchId);
//   console.log("Search Tracing Key:", searchTracingKey);

//   const token = await getAKBARToken();

//   console.log("AKBAR Token received:", !!token);

//   const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/rate`;

//   console.log("AKBAR RATE URL:", url);

//   try {
//     const response = await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "search-tracing-key": searchTracingKey,
//       },

//       timeout: 30000,
//     });

//     console.log("AKBAR RATE STATUS:", response.status);

//     console.log(
//       "AKBAR RATE RESPONSE:",
//       JSON.stringify(response.data, null, 2)
//     );

//     console.log("========== AKBAR RATE API END ==========");

//     return response.data;
//   } catch (error) {
//     console.error("========== AKBAR RATE API ERROR ==========");

//     console.error("Message:", error.message);
//     console.error("Status:", error.response?.status);

//     console.error(
//       "Response:",
//       JSON.stringify(error.response?.data, null, 2)
//     );

//     console.error("URL:", error.config?.url);
//     console.error("Params:", error.config?.params);

//     console.error("==========================================");

//     throw error;
//   }
// };



import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarHotelRateAPI = async ({
  searchId,
  searchTracingKey,
}) => {
  console.log("========== AKBAR RATE API START ==========");

  console.log("Search ID:", searchId);
  console.log("Search Tracing Key:", searchTracingKey);

  const token = await getAKBARToken();

  console.log("AKBAR Token received:", !!token);

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/rate`;

  console.log("AKBAR RATE URL:", url);

  try {
    // API TIMER START
    const apiStart = performance.now();

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "search-tracing-key": searchTracingKey,
      },

      timeout: 30000,
    });

    // API TIMER END
    const apiEnd = performance.now();

    console.log(
      `⏱️ AKBAR RATE API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
    );

    console.log("AKBAR RATE STATUS:", response.status);

    console.log(
      "AKBAR RATE RESPONSE:",
      JSON.stringify(response.data, null, 2)
    );

    console.log("========== AKBAR RATE API END ==========");

    return response.data;
  } catch (error) {
    console.error("========== AKBAR RATE API ERROR ==========");

    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);

    console.error(
      "Response:",
      JSON.stringify(error.response?.data, null, 2)
    );

    console.error("URL:", error.config?.url);
    console.error("Params:", error.config?.params);

    console.error("==========================================");

    throw error;
  }
};