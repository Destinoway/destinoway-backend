
// import axios from "axios";
// import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

// export const akbarHotelContentAPI = async ({
//   searchId,
//   searchTracingKey,
//   limit = 50,
//   offset = -1,
// }) => {
//   console.log("========== AKBAR CONTENT API START ==========");

//   console.log("Search ID:", searchId);
//   console.log("Search Tracing Key:", searchTracingKey);
//   console.log("Content Limit:", limit);
//   console.log("Content Offset:", offset);

//   const token = await getAKBARToken();

//   console.log("AKBAR Token received:", !!token);

//   const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/content`;

//   console.log("AKBAR CONTENT URL:", url);

//   try {
//     const apiStart = performance.now();

//     const response = await axios.get(url, {
//       params: {
//         limit,
//         offset,
//         filterdata: false,
//       },

//       headers: {
//         Authorization: `Bearer ${token}`,
//         "search-tracing-key": searchTracingKey,
//       },

//       timeout: 30000,
//     });

//     const apiEnd = performance.now();

//     console.log(
//       `⏱️ AKBAR CONTENT API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
//     );

//     console.log("========== AKBAR CONTENT RESPONSE ==========");

//     console.log("CONTENT STATUS:", response.status);

//     console.log(
//       "CONTENT SEARCH STATUS:",
//       response.data?.searchStatus
//     );

//     console.log(
//       "CONTENT HOTEL COUNT:",
//       response.data?.hotels?.length || 0
//     );

//     console.log(
//       "CONTENT TOTAL:",
//       response.data?.total ?? null
//     );

//     console.log(
//       "CONTENT ID SAMPLE:",
//       response.data?.hotels?.slice(0, 10).map((hotel) => ({
//         id: hotel.id,
//         name: hotel.name,
//       }))
//     );

//     console.log("=============================================");

//     return response.data;
//   } catch (error) {
//     console.error("========== AKBAR CONTENT API ERROR ==========");

//     console.error("Message:", error.message);
//     console.error("Status:", error.response?.status);

//     console.error(
//       "Response:",
//       JSON.stringify(error.response?.data, null, 2)
//     );

//     console.error("=============================================");

//     throw error;
//   }
// };


import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarHotelContentAPI = async ({
  searchId,
  searchTracingKey,
  limit,
  offset,
}) => {
  const token = await getAKBARToken();

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/content`;

  console.log("🏨 AKBAR CONTENT START");
  console.log("Search ID:", searchId);
  console.log("Limit:", limit);
  console.log("Offset:", offset);

  try {
    const apiStart = performance.now();

    const response = await axios.get(url, {
      params: {
        limit,
        offset,
        filterdata: false,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "search-tracing-key": searchTracingKey,
      },
      timeout: 30000,
    });

    const apiEnd = performance.now();

    const hotels = response.data?.hotels || [];

    const total =
      response.data?.total ??
      response.data?.Count ??
      response.data?.count ??
      0;

    console.log(
      `⏱️ AKBAR CONTENT API TIME (${offset}): ${(apiEnd - apiStart).toFixed(
        2
      )} ms`
    );

    console.log("✅ AKBAR CONTENT STATUS:", response.status);
    console.log("📦 CONTENT HOTELS RECEIVED:", hotels.length);
    console.log("📊 CONTENT TOTAL:", total);

    return response.data;
  } catch (error) {
    console.error("❌ AKBAR CONTENT ERROR");

    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
    console.error("URL:", error.config?.url);
    console.error("Params:", error.config?.params);

    throw error;
  }
};