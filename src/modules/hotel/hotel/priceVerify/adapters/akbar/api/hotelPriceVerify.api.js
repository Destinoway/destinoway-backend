import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";
import { logSupplierApiExchange } from "../../../../utils/hotelObservability.js";

export const akbarHotelPriceVerifyAPI = async ({
  correlationId,
  supplierSearchId,
  hotelId,
  providerName,
  recommendationId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/${supplierSearchId}/${encodeURIComponent(hotelId)}` +
    `/price/${encodeURIComponent(providerName)}/${encodeURIComponent(recommendationId)}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(searchTracingKey
      ? { "search-tracing-key": searchTracingKey }
      : {}),
  };
  const response = await logSupplierApiExchange(
    {
      operation: "hotel_price_verify",
      correlationId,
      method: "GET",
      endpoint: url,
      headers,
      request: null,
    },
    () => axios.get(url, { headers, timeout: 60000 }),
  );

  return response.data;
};
