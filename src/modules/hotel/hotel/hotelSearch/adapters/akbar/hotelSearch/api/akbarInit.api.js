// import axios from "axios";
// import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

// export const akbarInitAPI = async (payload) => {
//   const token = await getAKBARToken();

//   const response = await axios.post(
//     `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`,
//     payload,
//     {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       timeout: 30000,
//     }
//   );

//   return response.data;
// };

import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarInitAPI = async (payload) => {
  const token = await getAKBARToken();

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`;

  console.log("AKBAR INIT URL:", url);

  try {
    // API TIMER START
    const apiStart = performance.now();

    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    // API TIMER END
    const apiEnd = performance.now();

    console.log(
      `⏱️ AKBAR INIT API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
    );

    console.log("AKBAR INIT STATUS:", response.status);

    return response.data;
  } catch (error) {
    console.error("========== AKBAR INIT API ERROR ==========");

    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);

    console.error(
      "Response:",
      JSON.stringify(error.response?.data, null, 2)
    );

    throw error;
  }
};