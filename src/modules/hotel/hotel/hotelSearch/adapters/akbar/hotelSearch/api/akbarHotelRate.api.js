import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";


// =========================================================
// SLEEP
// =========================================================

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );


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
  console.log(
    "=========================================="
  );
  console.log(
    "🚀 AKBAR RATE POLLING STARTED"
  );
  console.log(
    "AKBAR SEARCH ID:",
    searchId
  );
  console.log(
    "=========================================="
  );


  // =========================================================
  // POLLING LOOP
  // =========================================================

  while (true) {
    attempt++;


    // =======================================================
    // CHECK SEARCH ACTIVE
    // =======================================================

    if (shouldContinue) {
      const active =
        await shouldContinue();

      if (!active) {
        console.log("");
        console.log(
          "=========================================="
        );
        console.log(
          `🛑 AKBAR RATE STOPPED`
        );
        console.log(
          `SEARCH ID: ${searchId}`
        );
        console.log(
          "=========================================="
        );

        return null;
      }
    }


    const start =
      performance.now();


    try {

      // =====================================================
      // GET AKBAR TOKEN
      // =====================================================

      const token =
        await getAKBARToken();


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
      // RATE REQUEST
      // =====================================================

      const response =
        await axios.get(
          url,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              "search-tracing-key":
                searchTracingKey,
            },

            timeout: 60000,
          }
        );


      const data =
        response.data;


      // =====================================================
      // RAW RESPONSE LOG
      // =====================================================

      console.log(
        "🔍 AKBAR RAW RATE RESPONSE:",
        JSON.stringify(
          data,
          null,
          2
        )
      );


      const elapsed =
        performance.now() -
        start;


      console.log(
        `⏱️ AKBAR RATE API TIME: ${elapsed.toFixed(2)} ms`
      );


      // =====================================================
      // SEARCH STATUS
      // =====================================================

      const searchStatus =
        String(
          data?.searchStatus || ""
        ).toLowerCase();


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
      // SEND CURRENT RATE DATA
      // TO ADAPTER
      // =====================================================

      if (onUpdate) {
        await onUpdate(data);
      }


      // =====================================================
      // SEARCH COMPLETED
      // =====================================================
      //
      // IMPORTANT:
      //
      // Do NOT use:
      //
      // hotels.length === total
      //
      // because Akbar can return:
      //
      // searchStatus = inProgress
      // hotels = 50
      // total = 50
      //
      // or:
      //
      // searchStatus = inProgress
      // hotels = 902
      // total = 902
      //
      // Completion is based ONLY on
      // searchStatus === completed.
      //
      // =====================================================

      if (
        searchStatus ===
        "completed"
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
      // SEARCH FAILED
      // =====================================================

      if (
        searchStatus ===
          "failed" ||
        searchStatus ===
          "failure" ||
        searchStatus ===
          "error"
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
      // AXIOS / API ERROR
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
        error.response?.data
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
      // IMPORTANT
      // =====================================================
      //
      // Do not continue polling after an actual API error.
      //
      // The parent search service will mark the
      // hotel search as failed.
      //
      // =====================================================

      throw error;
    }
  }
};