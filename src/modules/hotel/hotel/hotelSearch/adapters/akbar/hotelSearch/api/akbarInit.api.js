import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarInitAPI = async (payload) => {
  const token = await getAKBARToken();

  const response = await axios.post(
    `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    }
  );

  return response.data;
};