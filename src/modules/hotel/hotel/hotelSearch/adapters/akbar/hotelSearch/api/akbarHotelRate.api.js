import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

export const akbarHotelRateAPIWithPolling =
  async ({
    searchId,
    searchTracingKey,
    onUpdate,
    shouldContinue,
  }) => {
    const url =
      `${process.env.AKBAR_HOTEL_API_URL}` +
      `/api/hotels/search/result/${searchId}/rate`;

    let attempt = 0;

    while (true) {
      attempt++;

      // --------------------------------------------------
      // CHECK SEARCH IS STILL ACTIVE
      // --------------------------------------------------

      if (shouldContinue) {
        const active =
          await shouldContinue();

        if (!active) {
          console.log(
            `🛑 AKBAR RATE STOPPED: SEARCH ${searchId} CANCELLED`
          );

          return null;
        }
      }

      const start =
        performance.now();

      try {
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

        const response =
          await axios.get(url, {
            headers: {
              Authorization:
                `Bearer ${token}`,

              "search-tracing-key":
                searchTracingKey,
            },

            timeout: 60000,
          });

        const data =
          response.data;
          console.log(
  "🔍 AKBAR RAW RATE RESPONSE:",
  JSON.stringify(data, null, 2)
);

        const elapsed =
          performance.now() - start;

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
          "✅ RATE STATUS:",
          data?.status
        );

        // --------------------------------------------------
        // SEND LATEST RATE SNAPSHOT
        // --------------------------------------------------

        if (onUpdate) {
          await onUpdate(data);
        }

        // --------------------------------------------------
        // ACTUAL AKBAR COMPLETION CONDITION
        // --------------------------------------------------

        if (
          String(
            data?.searchStatus || ""
          ).toLowerCase() ===
          "completed"
        ) {
          console.log(
            "=========================================="
          );

          console.log(
            "✅ AKBAR RATE SEARCH COMPLETED"
          );

          console.log(
            "TOTAL RATE HOTELS:",
            data?.hotels?.length || 0
          );

          console.log(
            "=========================================="
          );

          return data;
        }

        // --------------------------------------------------
        // FAILURE
        // --------------------------------------------------

        const searchStatus =
          String(
            data?.searchStatus || ""
          ).toLowerCase();

        if (
          searchStatus === "failed" ||
          searchStatus === "error"
        ) {
          throw new Error(
            `AKBAR rate search failed: ${data?.searchStatus}`
          );
        }

        // --------------------------------------------------
        // CONTINUE POLLING
        // --------------------------------------------------

        console.log(
          "⏳ RATE STILL IN PROGRESS"
        );

        await sleep(1000);
      } catch (error) {
        console.error(
          `❌ AKBAR RATE ATTEMPT #${attempt} ERROR`
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

        throw error;
      }
    }
  };