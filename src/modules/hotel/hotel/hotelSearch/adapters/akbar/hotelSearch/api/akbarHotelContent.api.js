import axios from "axios";
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
} from "../../../../../../hotel/utils/hotelObservability.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isFailureResponse = (data) => {
  const status = String(data?.status || "").toLowerCase();
  const searchStatus = String(data?.searchStatus || "").toLowerCase();

  return (
    status === "failure" ||
    status === "failed" ||
    status === "error" ||
    searchStatus === "failure" ||
    searchStatus === "failed" ||
    searchStatus === "error"
  );
};

export const akbarHotelContentAPI = async ({
  searchId,
  correlationId,
  searchTracingKey,
  limit,
  offset,
  shouldContinue,
}) => {
  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${searchId}/content`;

  let attempt = 0;

  while (true) {
    attempt++;

    if (shouldContinue) {
      const active = await shouldContinue();

      if (!active) {
        logHotelEvent("info", "hotel.search.cancelled", {
          correlationId,
          supplier: "AKBAR",
          operation: "search_content",
          attempt,
        });
        return null;
      }
    }

    const token = await getAKBARToken();
    const apiStart = performance.now();

    logHotelEvent("info", "hotel.supplier_request.started", {
      correlationId,
      supplier: "AKBAR",
      operation: "search_content",
      attempt,
      limit,
      offset,
    });

    try {
      const response = await axios.get(url, {
        params: {
          limit,
          offset,
          filterdata: false,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "search-tracing-key": searchTracingKey,
        },
        timeout: 60000,
      });

      const data = response.data;
      const hotels = data?.hotels || [];

      const total =
        data?.total ??
        data?.Count ??
        data?.count ??
        0;

      const elapsed = performance.now() - apiStart;

      logHotelEvent("info", "hotel.supplier_request.completed", {
        correlationId,
        supplier: "AKBAR",
        operation: "search_content",
        attempt,
        limit,
        offset,
        httpStatus: response.status,
        durationMs: Math.round(elapsed),
        supplierStatus: data?.searchStatus ?? data?.status ?? null,
        hotelCount: hotels.length,
        total,
        ...getSupplierResponseSummary(data),
      });

      if (isFailureResponse(data)) {
        throw new Error(
          `AKBAR content search failed: ${
            data?.searchStatus || data?.status || "Unknown error"
          }`
        );
      }

      // First content call can return 200 + empty data while supplier
      // is still preparing content. Keep polling until content arrives.
      // For later pages, an empty page means pagination is finished.
      if (hotels.length > 0 || total > 0 || offset !== -1) {
        return data;
      }

      console.log(
        "⏳ AKBAR CONTENT EMPTY ON FIRST PAGE. RETRYING..."
      );

      await sleep(1000);
    } catch (error) {
      logHotelEvent("error", "hotel.supplier_request.failed", {
        correlationId,
        supplier: "AKBAR",
        operation: "search_content",
        attempt,
        limit,
        offset,
        httpStatus: error.response?.status ?? null,
        durationMs: Math.round(performance.now() - apiStart),
        errorCode: error.code ?? null,
        errorMessage: error.message,
        ...getSupplierResponseSummary(error.response?.data),
      });

      throw error;
    }
  }
};
