

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

const apiEnd = performance.now();

console.log(
  `⏱️ AKBAR RATE API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
);

return response.data;
  } catch (error) {
   

    throw error;
  }
};