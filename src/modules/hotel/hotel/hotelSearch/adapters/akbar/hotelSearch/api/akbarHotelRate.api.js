import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";


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

  console.log("");
  console.log("==========================================");
  console.log("🚀 AKBAR RATE POLLING STARTED");
  console.log("AKBAR SEARCH ID:", searchId);
  console.log("==========================================");


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
        console.log("");
        console.log(
          "=========================================="
        );
        console.log(
          "🛑 AKBAR RATE STOPPED"
        );
        console.log(
          "SEARCH ID:",
          searchId
        );
        console.log(
          "=========================================="
        );

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

      console.log("");
      console.log(
        "=========================================="
      );
      console.log(
        `🔄 AKBAR RATE POLLING ATTEMPT #${attempt}`
      );
      console.log(
        "=========================================="
      );


      // =====================================================
      // CALL AKBAR RATE API
      // =====================================================

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

      console.log(
        `⏱️ AKBAR RATE API TIME: ${elapsed.toFixed(2)} ms`
      );

      console.log(
        "📊 RATE SEARCH STATUS:",
        data?.searchStatus
      );

      console.log(
        "🏨 RATE HOTELS:",
        data?.hotels?.length || 0
      );

      console.log(
        "📦 RATE TOTAL:",
        data?.total || 0
      );

      console.log(
        "✅ RATE RESPONSE STATUS:",
        data?.status
      );


      // =====================================================
      // RAW RESPONSE
      // =====================================================

      console.log(
        "🔍 AKBAR RAW RATE RESPONSE:",
        JSON.stringify(
          data,
          null,
          2
        )
      );


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

        console.log("");
        console.log(
          "=========================================="
        );

        console.log(
          "✅ AKBAR RATE SEARCH COMPLETED"
        );

        console.log(
          "SEARCH ID:",
          searchId
        );

        console.log(
          "TOTAL RATE HOTELS:",
          data?.hotels?.length || 0
        );

        console.log(
          "RATE TOTAL:",
          data?.total || 0
        );

        console.log(
          "TOTAL ATTEMPTS:",
          attempt
        );

        console.log(
          "=========================================="
        );


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

        console.error("");
        console.error(
          "=========================================="
        );

        console.error(
          "❌ AKBAR RATE SEARCH FAILED"
        );

        console.error(
          "SEARCH ID:",
          searchId
        );

        console.error(
          "SEARCH STATUS:",
          data?.searchStatus
        );

        console.error(
          "RESPONSE STATUS:",
          data?.status
        );

        console.error(
          "=========================================="
        );


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

      console.error("");
      console.error(
        "=========================================="
      );

      console.error(
        `❌ AKBAR RATE ATTEMPT #${attempt} ERROR`
      );

      console.error(
        "=========================================="
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Status:",
        error.response?.status
      );

      console.error(
        "Response:",
        JSON.stringify(
          error.response?.data,
          null,
          2
        )
      );

      console.error(
        "URL:",
        url
      );

      console.error(
        "Search ID:",
        searchId
      );

      console.error(
        "Attempt:",
        attempt
      );

      console.error(
        "=========================================="
      );


      // =====================================================
      // STOP POLLING ON REAL API ERROR
      // =====================================================

      throw error;
    }
  }
};