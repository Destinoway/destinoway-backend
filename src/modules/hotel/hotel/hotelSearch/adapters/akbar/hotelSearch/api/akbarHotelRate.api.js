import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarHotelRateAPI = async ({
  searchId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

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