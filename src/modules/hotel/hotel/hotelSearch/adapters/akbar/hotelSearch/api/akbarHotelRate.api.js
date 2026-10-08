import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

  while (true) {
    attempt++;

    if (shouldContinue) {
      const active = await shouldContinue();

      if (!active) {
        console.log("");
        console.log("==========================================");
        console.log("🛑 AKBAR RATE STOPPED");
        console.log("SEARCH ID:", searchId);
        console.log("==========================================");
        return null;
      }
    }

    const start = performance.now();

    try {
      const token = await getAKBARToken();

      console.log("");
      console.log("==========================================");
      console.log(`🔄 AKBAR RATE POLLING ATTEMPT #${attempt}`);
      console.log("==========================================");

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "search-tracing-key": searchTracingKey,
        },
        timeout: 60000,
      });

      const data = response.data;
      const elapsed = performance.now() - start;

      const searchStatus = String(
        data?.searchStatus || ""
      ).toLowerCase();

      const responseStatus = String(
        data?.status || ""
      ).toLowerCase();

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

      console.log(
        "🔍 AKBAR RAW RATE RESPONSE:",
        JSON.stringify(data, null, 2)
      );

      // Always publish the latest snapshot before checking completion.
      if (onUpdate) {
        await onUpdate(data);
      }

      // IMPORTANT: hotel count is NOT the completion signal.
      if (searchStatus === "completed") {
        console.log("");
        console.log("==========================================");
        console.log("✅ AKBAR RATE SEARCH COMPLETED");
        console.log("SEARCH ID:", searchId);
        console.log(
          "TOTAL RATE HOTELS:",
          data?.hotels?.length || 0
        );
        console.log("RATE TOTAL:", data?.total || 0);
        console.log("TOTAL ATTEMPTS:", attempt);
        console.log("==========================================");

        return data;
      }

      // Akbar has returned failure in `status` with no searchStatus
      // in some responses, so handle both fields.
      if (
        searchStatus === "failed" ||
        searchStatus === "failure" ||
        searchStatus === "error" ||
        responseStatus === "failed" ||
        responseStatus === "failure" ||
        responseStatus === "error"
      ) {
        console.error("");
        console.error("==========================================");
        console.error("❌ AKBAR RATE SEARCH FAILED");
        console.error("SEARCH ID:", searchId);
        console.error(
          "SEARCH STATUS:",
          data?.searchStatus
        );
        console.error(
          "RESPONSE STATUS:",
          data?.status
        );
        console.error("==========================================");

        throw new Error(
          `AKBAR rate search failed: ${
            data?.searchStatus ||
            data?.status ||
            "Unknown error"
          }`
        );
      }

      console.log("⏳ RATE STILL IN PROGRESS");
      console.log(
        `⏳ Waiting 1 second before attempt #${attempt + 1}`
      );

      await sleep(1000);
    } catch (error) {
      console.error("");
      console.error("==========================================");
      console.error(
        `❌ AKBAR RATE ATTEMPT #${attempt} ERROR`
      );
      console.error("==========================================");
      console.error("Message:", error.message);
      console.error("Status:", error.response?.status);
      console.error(
        "Response:",
        JSON.stringify(error.response?.data, null, 2)
      );
      console.error("URL:", url);
      console.error("Search ID:", searchId);
      console.error("Attempt:", attempt);
      console.error("==========================================");

      throw error;
    }
  }
};
