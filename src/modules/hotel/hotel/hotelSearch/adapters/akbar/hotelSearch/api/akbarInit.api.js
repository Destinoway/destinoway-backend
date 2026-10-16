

import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";
import {
  getResponseShape,
  getSupplierResponseSummary,
  logHotelEvent,
} from "../../../../../../hotel/utils/hotelObservability.js";

export const akbarInitAPI = async (payload, { correlationId } = {}) => {
  const token = await getAKBARToken();

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/init`;

  const startedAt = performance.now();
  logHotelEvent("info", "hotel.supplier_request.started", {
    correlationId,
    supplier: "AKBAR",
    operation: "search_init",
  });

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

    console.log(
      `⏱️ AKBAR INIT API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
    );

    logHotelEvent("info", "hotel.supplier_request.completed", {
      correlationId,
      supplier: "AKBAR",
      operation: "search_init",
      httpStatus: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      supplierSearchId:
        initData?.searchId ??
        initData?.searchID ??
        initData?.SearchId ??
        initData?.SearchID ??
        null,
      searchTracingKey:
        initData?.searchTracingKey ??
        initData?.SearchTracingKey ??
        initData?.searchTracingID
        ? "present"
        : "missing",
      ...getResponseShape(response.data),
      ...getSupplierResponseSummary(response.data),
    });

    return response.data;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_request.failed", {
      correlationId,
      supplier: "AKBAR",
      operation: "search_init",
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });

    throw error;
  }
};