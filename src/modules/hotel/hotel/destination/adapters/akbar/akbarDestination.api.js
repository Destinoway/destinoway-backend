import axios from "axios";
import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
import { logSupplierApiExchange } from "../../../utils/hotelObservability.js";

export const searchAKBARDestinationAPI = async (searchInput, { correlationId } = {}) => {
  const token = await getAKBARToken({
    operation: "destination_search",
    correlationId,
  });

  const endpoint = `${process.env.AKBAR_HOTEL_API_URL}/api/content/autosuggest`;
  const params = { term: searchInput };
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  const response = await logSupplierApiExchange(
    {
      operation: "destination_search",
      correlationId,
      method: "GET",
      endpoint,
      headers,
      request: { query: params },
    },
    () => axios.get(endpoint, { params, headers }),
  );

  return response.data;
};
