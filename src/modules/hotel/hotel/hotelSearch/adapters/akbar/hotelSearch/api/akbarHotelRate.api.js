

// import axios from "axios";
// import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

// const RATE_REQUEST_TIMEOUT = 10000;

// // Overall maximum time we allow Rate polling to continue.
// // This is NOT the timeout of one API request.
// const RATE_MAX_POLL_TIME = 20000;

// // Delay between polling attempts.
// const RATE_POLL_DELAY = 700;

// export const akbarHotelRateAPI = async ({
//   searchId,
//   searchTracingKey,
// }) => {
//   console.log("========== AKBAR RATE API START ==========");

//   console.log("Search ID:", searchId);
//   console.log("Search Tracing Key:", searchTracingKey);

//   const token = await getAKBARToken();

//   console.log("AKBAR Token received:", !!token);

//   const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/rate`;

//   console.log("AKBAR RATE URL:", url);

//   try {
//     const apiStart = performance.now();

//     const response = await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "search-tracing-key": searchTracingKey,
//       },

//       timeout: RATE_REQUEST_TIMEOUT,
//     });

//     const apiEnd = performance.now();

//     console.log(
//       `⏱️ AKBAR RATE API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
//     );

//     return response.data;
//   } catch (error) {
//     console.error("========== AKBAR RATE API ERROR ==========");

//     console.error("Message:", error.message);
//     console.error("Status:", error.response?.status);

//     console.error(
//       "Response:",
//       JSON.stringify(error.response?.data, null, 2)
//     );

//     console.error("===========================================");

//     throw error;
//   }
// };

// /**
//  * Poll AKBAR Rate API until the rate search is completed.
//  *
//  * Completion conditions:
//  *
//  * 1. searchStatus === "completed"
//  *
//  * OR
//  *
//  * 2. hotels.length >= total
//  *
//  * Safety:
//  *
//  * Overall polling timeout prevents the request
//  * from waiting indefinitely.
//  */
// export const akbarHotelRateAPIWithPolling = async ({
//   searchId,
//   searchTracingKey,
// }) => {
//   console.log("========== AKBAR RATE POLLING START ==========");

//   const pollingStart = performance.now();

//   let attempt = 0;

//   while (true) {
//     attempt++;

//     const elapsedTime =
//       performance.now() - pollingStart;

//     // ========================================
//     // OVERALL TIMEOUT
//     // ========================================

//     if (elapsedTime >= RATE_MAX_POLL_TIME) {
//       throw new Error(
//         `AKBAR Rate polling timeout after ${Math.round(
//           elapsedTime
//         )} ms`
//       );
//     }

//     console.log(
//       `🔄 AKBAR RATE ATTEMPT ${attempt}`
//     );

//     // ========================================
//     // CALL RATE API
//     // ========================================

//     const response = await akbarHotelRateAPI({
//       searchId,
//       searchTracingKey,
//     });

//     const searchStatus = String(
//       response?.searchStatus || ""
//     ).toLowerCase();

//     const hotels = response?.hotels || [];

//     const total = Number(
//       response?.total || 0
//     );

//     console.log(
//       "📊 AKBAR RATE STATUS:",
//       response?.searchStatus
//     );

//     console.log(
//       "📊 AKBAR RATE HOTEL COUNT:",
//       hotels.length
//     );

//     console.log(
//       "📊 AKBAR RATE TOTAL:",
//       total
//     );

//     console.log(
//       `📊 AKBAR RATE PROGRESS: ${hotels.length}/${total || "?"}`
//     );

//     // ========================================
//     // FAILURE
//     // ========================================

//     if (
//       searchStatus === "failed" ||
//       searchStatus === "error"
//     ) {
//       throw new Error(
//         `AKBAR Rate search failed with status: ${response?.searchStatus}`
//       );
//     }

//     // ========================================
//     // COMPLETED
//     // ========================================

//     const isCompleted =
//       searchStatus === "completed";

//     // ========================================
//     // ALL HOTELS RECEIVED
//     // ========================================

//     const hasAllHotels =
//       total > 0 &&
//       hotels.length >= total;

//     if (isCompleted || hasAllHotels) {
//       const totalPollingTime =
//         performance.now() - pollingStart;

//       console.log(
//         "✅ AKBAR RATE SEARCH COMPLETED"
//       );

//       console.log(
//         "Completion Reason:",
//         isCompleted
//           ? "searchStatus=completed"
//           : "hotels.length >= total"
//       );

//       console.log(
//         "Final Rate Hotel Count:",
//         hotels.length
//       );

//       console.log(
//         "Final Rate Total:",
//         total
//       );

//       console.log(
//         `⏱️ TOTAL RATE POLLING TIME: ${totalPollingTime.toFixed(
//           2
//         )} ms`
//       );

//       console.log(
//         "=============================================="
//       );

//       return response;
//     }

//     // ========================================
//     // WAIT BEFORE NEXT ATTEMPT
//     // ========================================

//     const nextElapsedTime =
//       performance.now() - pollingStart;

//     const remainingTime =
//       RATE_MAX_POLL_TIME - nextElapsedTime;

//     if (remainingTime <= 0) {
//       throw new Error(
//         "AKBAR Rate polling timeout"
//       );
//     }

//     const waitTime = Math.min(
//       RATE_POLL_DELAY,
//       remainingTime
//     );

//     console.log(
//       `⏳ AKBAR RATE NOT COMPLETE. WAITING ${waitTime} ms...`
//     );

//     await new Promise((resolve) =>
//       setTimeout(resolve, waitTime)
//     );
//   }
// };
import axios from "axios";

import {
  getAKBARToken,
} from "../../../../../../supplier/akbar/akbarAuth.service.js";

/**
 * Poll AKBAR Rate API until search is completed.
 *
 * Important:
 * - No overall 20-second timeout.
 * - Every individual HTTP request has a timeout.
 * - onUpdate() receives every rate response.
 */
export const akbarHotelRateAPIWithPolling = async ({
  searchId,
  searchTracingKey,
  onUpdate,
}) => {
  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${searchId}/rate`;

  console.log(
    "🔄 AKBAR RATE POLLING START"
  );

  let attempt = 0;

  while (true) {
    attempt += 1;

    const attemptStart = performance.now();

    try {
      const token =
        await getAKBARToken();

      console.log(
        `🔄 AKBAR RATE ATTEMPT #${attempt}`
      );

      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "search-tracing-key":
              searchTracingKey,
          },

          // Individual HTTP request timeout only.
          // There is NO overall polling timeout.
          timeout: 60000,
        }
      );

      const attemptEnd =
        performance.now();

      const data = response.data;

      console.log(
        `⏱️ AKBAR RATE ATTEMPT #${attempt} TIME: ` +
          `${(attemptEnd - attemptStart).toFixed(2)} ms`
      );

      console.log(
        `📊 AKBAR RATE STATUS: ${
          data?.searchStatus
        }`
      );

      console.log(
        `📊 AKBAR RATE HOTELS: ${
          data?.hotels?.length || 0
        }`
      );

      console.log(
        `📊 AKBAR RATE TOTAL: ${
          data?.total ??
          data?.Count ??
          data?.count ??
          0
        }`
      );

      /**
       * Send every response to background search.
       */
      if (onUpdate) {
        await onUpdate(data);
      }

      const searchStatus =
        String(
          data?.searchStatus || ""
        ).toLowerCase();

      /**
       * SUCCESS
       */
      if (
        searchStatus === "completed"
      ) {
        console.log(
          "✅ AKBAR RATE SEARCH COMPLETED"
        );

        return data;
      }

      /**
       * FAILURE
       */
      if (
        searchStatus === "failed" ||
        searchStatus === "error"
      ) {
        throw new Error(
          `AKBAR Rate search failed. Status: ${data?.searchStatus}`
        );
      }

      /**
       * Still processing.
       */
      console.log(
        "⏳ AKBAR RATE SEARCH STILL IN PROGRESS"
      );

      /**
       * Small delay before next poll.
       *
       * We are intentionally NOT using
       * a 20-second total timeout.
       */
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

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );