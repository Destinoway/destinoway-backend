import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
} from "../../../../../../hotel/utils/hotelObservability.js";


// =========================================================
// SLEEP
// =========================================================

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


// =========================================================
// AKBAR HOTEL RATE API WITH POLLING
// =========================================================

export const akbarHotelRateAPIWithPolling = async (
  {
    searchId,
    correlationId,
    searchTracingKey,
  },
  {
    onUpdate,
    shouldContinue,
  } = {}
) => {
  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${searchId}/rate`;

  let attempt = 0;

  logHotelEvent("info", "hotel.search.polling.started", {
    correlationId,
    supplier: "AKBAR",
    operation: "search_rate",
    supplierSearchId: searchId,
  });


  // =========================================================
  // POLLING LOOP
  // =========================================================

  while (true) {
    attempt++;


    // =======================================================
    // CHECK WHETHER SEARCH IS STILL ACTIVE
    // =======================================================

    if (shouldContinue) {
      const active = await shouldContinue();

      if (!active) {
        logHotelEvent("info", "hotel.search.polling.cancelled", {
          correlationId,
          supplier: "AKBAR",
          operation: "search_rate",
          supplierSearchId: searchId,
          attempts: attempt,
        });

        return null;
      }
    }


    const start = performance.now();


    try {

      // =====================================================
      // GET AKBAR TOKEN
      // =====================================================

      const token = await getAKBARToken();


      // =====================================================
      // POLLING ATTEMPT
      // =====================================================

      logHotelEvent("info", "hotel.supplier_request.started", {
        correlationId,
        supplier: "AKBAR",
        operation: "search_rate",
        supplierSearchId: searchId,
        attempt,
      });


      // =====================================================
      // CALL AKBAR RATE API
      // =====================================================

      const requestStart = performance.now();
      const response = await axios.get(
        url,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            "search-tracing-key":
              searchTracingKey,
          },

          // Individual HTTP request timeout.
          // There is NO overall polling timeout.
          timeout: 60000,
        }
      );


      const data = response.data;


      const elapsed =
        performance.now() - start;


      // =====================================================
      // NORMALIZE STATUS
      // =====================================================

      const searchStatus = String(
        data?.searchStatus || ""
      ).toLowerCase();


      const responseStatus = String(
        data?.status || ""
      ).toLowerCase();


      // =====================================================
      // LOG RESPONSE SUMMARY
      // =====================================================

      logHotelEvent("info", "hotel.supplier_request.completed", {
        correlationId,
        supplier: "AKBAR",
        operation: "search_rate",
        supplierSearchId: searchId,
        attempt,
        httpStatus: response.status,
        durationMs: Math.round(performance.now() - requestStart),
        attemptDurationMs: Math.round(elapsed),
        supplierStatus: data?.searchStatus ?? data?.status ?? null,
        hotelCount: data?.hotels?.length ?? 0,
        total: data?.total ?? 0,
        ...getSupplierResponseSummary(data),
      });


      // =====================================================
      // PUBLISH LATEST RATE SNAPSHOT
      // =====================================================
      //
      // IMPORTANT:
      //
      // This runs for every response:
      //
      // inProgress #1
      // inProgress #2
      // inProgress #3
      // completed
      //
      // Adapter uses this to progressively update Redis.
      //
      // =====================================================

      if (onUpdate) {
        await onUpdate(data);
      }


      // =====================================================
      // COMPLETION CHECK
      // =====================================================
      //
      // DO NOT use:
      //
      // hotels.length === total
      //
      // Completion is based ONLY on:
      //
      // searchStatus === "completed"
      //
      // =====================================================

      if (
        searchStatus === "completed"
      ) {

        logHotelEvent("info", "hotel.search.polling.completed", {
          correlationId,
          supplier: "AKBAR",
          operation: "search_rate",
          supplierSearchId: searchId,
          attempts: attempt,
          supplierStatus: data?.searchStatus ?? data?.status ?? null,
          hotelCount: data?.hotels?.length ?? 0,
          total: data?.total ?? 0,
        });

        return data;
      }


      // =====================================================
      // FAILURE CHECK
      // =====================================================
      //
      // Akbar may return:
      //
      // searchStatus = failed
      //
      // OR
      //
      // searchStatus = failure
      //
      // OR
      //
      // searchStatus = error
      //
      // OR sometimes:
      //
      // searchStatus = undefined
      // status = failure
      //
      // So both fields are checked.
      //
      // =====================================================

      if (
        searchStatus === "failed" ||
        searchStatus === "failure" ||
        searchStatus === "error" ||
        responseStatus === "failed" ||
        responseStatus === "failure" ||
        responseStatus === "error"
      ) {

        logHotelEvent("error", "hotel.search.polling.failed", {
          correlationId,
          supplier: "AKBAR",
          operation: "search_rate",
          supplierSearchId: searchId,
          attempts: attempt,
          supplierStatus: data?.searchStatus ?? data?.status ?? null,
          ...getSupplierResponseSummary(data),
        });

        throw new Error(
          `AKBAR rate search failed: ${
            data?.searchStatus ||
            data?.status ||
            "Unknown error"
          }`
        );
      }


      // =====================================================
      // STILL IN PROGRESS
      // =====================================================

      console.log(
        "⏳ RATE STILL IN PROGRESS"
      );

      console.log(
        `⏳ Waiting 1 second before attempt #${
          attempt + 1
        }`
      );


      // =====================================================
      // WAIT BEFORE NEXT POLL
      // =====================================================

      await sleep(1000);

    } catch (error) {

      // =====================================================
      // AXIOS / TOKEN / API ERROR
      // =====================================================

      logHotelEvent("error", "hotel.supplier_request.failed", {
        correlationId,
        supplier: "AKBAR",
        operation: "search_rate",
        supplierSearchId: searchId,
        attempt,
        httpStatus: error.response?.status ?? null,
        durationMs: Math.round(performance.now() - start),
        errorCode: error.code ?? null,
        errorMessage: error.message,
        ...getSupplierResponseSummary(error.response?.data),
      });


      // =====================================================
      // STOP POLLING ON REAL API ERROR
      // =====================================================

      throw error;
    }
  }
};