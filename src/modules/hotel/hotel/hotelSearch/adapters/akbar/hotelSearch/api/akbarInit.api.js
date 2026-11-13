import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";
import {
  logSupplierApiExchange,
  resetSupplierHotelLogLimit,
} from "../../../../../../hotel/utils/hotelObservability.js";

export const akbarInitAPI = async (payload, { correlationId } = {}) => {
  const token = await getAKBARToken({
    operation: "search_init",
    correlationId,
  });
  const endpoint = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  resetSupplierHotelLogLimit(correlationId);
  const response = await logSupplierApiExchange(
    {
      operation: "hotel_search_init",
      correlationId,
      hotelLogKey: correlationId,
      method: "POST",
      endpoint,
      headers,
      request: { body: payload },
    },
    () =>
      axios.post(endpoint, payload, {
        headers,
        timeout: 30000,
      }),
  );

  return response.data;
};
