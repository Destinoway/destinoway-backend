import axios from "axios";
import { getAKBARInitContext } from "../../../../../../supplier/akbar/akbarAgentProfile.service.js";
import {
  logSupplierApiExchange,
  resetSupplierHotelLogLimit,
} from "../../../../../../hotel/utils/hotelObservability.js";

export const akbarInitAPI = async (payload, { correlationId } = {}) => {
  const { token, ...initFields } = await getAKBARInitContext({
    correlationId,
  });
  const requestBody = { ...payload, ...initFields };
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
      request: { body: requestBody },
    },
    () =>
      axios.post(endpoint, requestBody, {
        headers,
      }),
  );

  return response.data;
};
