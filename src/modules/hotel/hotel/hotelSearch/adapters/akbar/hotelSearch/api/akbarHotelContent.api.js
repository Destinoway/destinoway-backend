import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarHotelContentAPI = async ({
  searchId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const response = await axios.get(
    `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/content`,
    {
      params: {
        limit: 50,
        offset: -1,
        filterdata: false,
      },

      headers: {
        Authorization: `Bearer ${token}`,
        "search-tracing-key": searchTracingKey,
      },

      timeout: 30000,
    }
  );

  return response.data;
};