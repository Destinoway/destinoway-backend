

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
import { getAKBARToken } from "../../../../../../supplier/akbar/akbarAuth.service.js";

const RATE_REQUEST_TIMEOUT = 10000;
const RATE_MAX_POLL_TIME = 20000;
const RATE_POLL_DELAY = 700;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const akbarHotelRateAPI = async ({
  searchId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const url = `${process.env.AKBAR_HOTEL_API_URL}/api/hotels/search/result/${searchId}/rate`;

  console.log("💰 AKBAR RATE API START");
  console.log("Search ID:", searchId);

  try {
    const apiStart = performance.now();

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "search-tracing-key": searchTracingKey,
      },
      timeout: RATE_REQUEST_TIMEOUT,
    });

    const apiEnd = performance.now();

    console.log(
      `⏱️ AKBAR RATE API TIME: ${(apiEnd - apiStart).toFixed(2)} ms`
    );

    console.log("✅ AKBAR RATE STATUS:", response.status);

    return response.data;
  } catch (error) {
    console.error("❌ AKBAR RATE ERROR");

    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
    console.error("URL:", error.config?.url);

    throw error;
  }
};

export const akbarHotelRateAPIWithPolling = async ({
  searchId,
  searchTracingKey,
}) => {
  const pollingStart = Date.now();

  let attempt = 0;

  while (true) {
    attempt++;

    const elapsed = Date.now() - pollingStart;

    if (elapsed >= RATE_MAX_POLL_TIME) {
      throw new Error(
        `AKBAR Rate polling timeout after ${RATE_MAX_POLL_TIME} ms`
      );
    }

    console.log("");
    console.log("==========================================");
    console.log(`🔄 AKBAR RATE POLLING ATTEMPT: ${attempt}`);
    console.log(`⏱️ ELAPSED: ${elapsed} ms`);
    console.log("==========================================");

    const response = await akbarHotelRateAPI({
      searchId,
      searchTracingKey,
    });

    const searchStatus = String(
      response?.searchStatus || ""
    ).toLowerCase();

    const hotels = response?.hotels || [];

    const total = response?.total ?? hotels.length;

    console.log("📊 RATE SEARCH STATUS:", searchStatus);
    console.log("🏨 RATE HOTELS:", hotels.length);
    console.log("📦 RATE TOTAL:", total);

    // IMPORTANT:
    // Do NOT use hotels.length >= total here.
    // Supplier can return inProgress with hotels already available.
    if (searchStatus === "completed") {
      console.log("");
      console.log("✅ AKBAR RATE SEARCH COMPLETED");
      console.log("Final Rate Hotels:", hotels.length);
      console.log("Final Rate Total:", total);

      return response;
    }

    if (
      searchStatus === "failed" ||
      searchStatus === "error"
    ) {
      throw new Error(
        `AKBAR Rate search failed. Status: ${searchStatus}`
      );
    }

    console.log(
      `⏳ RATE STILL IN PROGRESS. Waiting ${RATE_POLL_DELAY} ms...`
    );

    await sleep(RATE_POLL_DELAY);
  }
};