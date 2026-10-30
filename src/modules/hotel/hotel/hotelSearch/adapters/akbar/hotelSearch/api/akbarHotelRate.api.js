import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";
import { logSupplierApiExchange } from "../../../../../../hotel/utils/hotelObservability.js";


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



      // =====================================================
      // CALL AKBAR RATE API
      // =====================================================

      const headers = {
        Authorization: `Bearer ${token}`,
        "search-tracing-key": searchTracingKey,
      };
      const response = await logSupplierApiExchange(
        {
          operation: "hotel_search_rate",
          correlationId,
          hotelLogKey: correlationId ?? searchId,
          method: "GET",
          endpoint: url,
          headers,
          request: null,
        },
        () =>
          axios.get(url, {
            headers,
            // Individual HTTP request timeout. There is no overall polling timeout.
            timeout: 60000,
          }),
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




      // =====================================================
      // WAIT BEFORE NEXT POLL
      // =====================================================

      await sleep(1000);

    } catch (error) {

      // =====================================================
      // AXIOS / TOKEN / API ERROR
      // =====================================================



      // =====================================================
      // STOP POLLING ON REAL API ERROR
      // =====================================================

      throw error;
    }
  }
};
