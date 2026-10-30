import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";
import { logSupplierApiExchange } from "../../../../utils/hotelObservability.js";

export const hotelContentAPI = async ({
  correlationId,
  supplierSearchId,
  hotelId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/${supplierSearchId}/${encodeURIComponent(hotelId)}/content`;

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(searchTracingKey
      ? { "search-tracing-key": searchTracingKey }
      : {}),
  };
  const response = await logSupplierApiExchange(
    {
      operation: "hotel_details_content",
      correlationId,
      hotelLogKey: `${correlationId}:hotel-details:${hotelId}`,
      method: "GET",
      endpoint: url,
      headers,
      request: null,
    },
    () => axios.get(url, { headers, timeout: 60000 }),
  );

  return response.data;
};
