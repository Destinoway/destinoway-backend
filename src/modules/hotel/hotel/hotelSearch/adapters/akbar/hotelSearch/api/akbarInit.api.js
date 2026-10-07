

import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

export const akbarInitAPI = async (payload) => {
  const token = await getAKBARToken();

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`;

  console.log("AKBAR INIT URL:", url);

  try {
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

const apiEnd = performance.now();

console.log(
  `⏱️ AKBAR INIT API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
);

return response.data;
  } catch (error) {
    

    throw error;
  }
};