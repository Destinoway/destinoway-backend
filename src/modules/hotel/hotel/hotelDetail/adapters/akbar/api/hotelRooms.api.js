import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";
import {
  logSupplierApiExchange,
} from "../../../../utils/hotelObservability.js";

export const hotelRoomsAPI = async ({
  correlationId,
  supplierSearchId,
  hotelId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${supplierSearchId}/${encodeURIComponent(hotelId)}/rooms`;

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(searchTracingKey
      ? { "search-tracing-key": searchTracingKey }
      : {}),
  };
  const response = await logSupplierApiExchange(
    {
      operation: "hotel_details_rooms",
      correlationId,
      hotelLogKey: `${correlationId}:hotel-rooms:${hotelId}`,
      method: "GET",
      endpoint: url,
      headers,
      request: null,
    },
    () => axios.get(url, { headers, timeout: 60000 }),
  );

  return response.data;
};
