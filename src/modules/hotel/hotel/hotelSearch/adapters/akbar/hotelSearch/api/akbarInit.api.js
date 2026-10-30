

import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";
import {
  getResponseShape,
  getSupplierResponseSummary,
  logHotelEvent,
} from "../../../../../../hotel/utils/hotelObservability.js";

export const akbarInitAPI = async (payload, { correlationId } = {}) => {
  const token = await getAKBARToken({
    operation: "search_init",
    correlationId,
  });

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`;

  const startedAt = performance.now();

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
    const initData =
      response.data?.data && typeof response.data.data === "object"
        ? response.data.data
        : response.data;



    return response.data;
  } catch (error) {

    throw error;
  }
};