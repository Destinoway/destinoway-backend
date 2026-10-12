


import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";

export const hotelPricingAPI = async ({
  supplierSearchId,
  hotelId,
  providerName,
  recommendationId,
  searchTracingKey,
}) => {
  if (!providerName || !recommendationId) {
    const error = new Error(
      "providerName and recommendationId are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const token = await getAKBARToken();

  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/${supplierSearchId}/${encodeURIComponent(hotelId)}` +
    `/price/${encodeURIComponent(providerName)}/${encodeURIComponent(recommendationId)}`;

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