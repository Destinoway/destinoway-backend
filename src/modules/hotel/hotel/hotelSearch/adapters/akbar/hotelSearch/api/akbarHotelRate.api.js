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

  const response = await axios.get(
    `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/rate`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "search-tracing-key": searchTracingKey,
      },

      timeout: 30000,
    }
  );

  return response.data;

};

  console.log("AKBAR RATE STATUS:", response.status);

console.log(
  "AKBAR RATE RESPONSE:",
  JSON.stringify(response.data, null, 2)
);

console.log("========== AKBAR RATE API END ==========");