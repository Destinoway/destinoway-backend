import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";

export const hotelRoomsAPI = async ({
  supplierSearchId,
  hotelId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${supplierSearchId}/${encodeURIComponent(hotelId)}/rooms`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(searchTracingKey
        ? { "search-tracing-key": searchTracingKey }
        : {}),
    },
    timeout: 60000,
  });

  return response.data;
};