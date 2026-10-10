// import crypto from "crypto";

// import {
//   akbarHotelSearchAdapter,
// } from "../adapters/akbar/hotelSearch/akbarHotelSearch.adapter.js";

// import {
//   createHotelSearchState,
//   getActiveSearchId,
//   cancelAndDeleteHotelSearch,
//   failHotelSearch,
// } from "./hotelSearch.redis.service.js";

// // =========================================================
// // SUPPLIER ADAPTERS
// // =========================================================

// const supplierAdapters = {
//   AKBAR: akbarHotelSearchAdapter,
// };

// // =========================================================
// // START HOTEL SEARCH
// // =========================================================

// export const searchHotels = async ({
//   payload,
//   searchSessionId,
// }) => {
//   const supplier = "AKBAR";

//   const adapter =
//     supplierAdapters[supplier];

//   if (!adapter) {
//     throw new Error(
//       `Hotel supplier not configured: ${supplier}`
//     );
//   }

//   if (!searchSessionId) {
//     throw new Error(
//       "Search session ID is required"
//     );
//   }

//   // =======================================================
//   // 1. FIND PREVIOUS ACTIVE SEARCH
//   // =======================================================

//   const previousSearchId =
//     await getActiveSearchId(
//       searchSessionId
//     );

//   // =======================================================
//   // 2. CANCEL PREVIOUS SEARCH
//   // =======================================================

//   if (previousSearchId) {
//     console.log(
//       "🔄 PREVIOUS HOTEL SEARCH FOUND:",
//       previousSearchId
//     );

//     await cancelAndDeleteHotelSearch(
//       previousSearchId,
//       searchSessionId
//     );
//   }

//   // =======================================================
//   // 3. CREATE NEW INTERNAL SEARCH ID
//   // =======================================================

//   const searchId =
//     crypto.randomUUID();

//   // =======================================================
//   // 4. CREATE REDIS STATE
//   // =======================================================

//   await createHotelSearchState({
//     searchId,
//     searchSessionId,
//     supplier,
//   });

//   console.log(
//     "🚀 NEW HOTEL SEARCH:",
//     searchId
//   );

//   // =======================================================
//   // 5. START BACKGROUND SEARCH
//   // =======================================================

//   setImmediate(() => {
//     adapter
//       .search(payload, {
//         internalSearchId: searchId,
//         searchSessionId,
//       })
//       .catch(async (error) => {
//         console.error(
//           "❌ BACKGROUND HOTEL SEARCH FAILED:",
//           error
//         );

//         try {
//           await failHotelSearch(
//             searchId,
//             error
//           );
//         } catch (redisError) {
//           console.error(
//             "❌ FAILED TO UPDATE REDIS SEARCH ERROR:",
//             redisError
//           );
//         }
//       });
//   });

//   // =======================================================
//   // 6. RETURN IMMEDIATELY
//   // =======================================================

//   return {
//     searchId,

//     searchSessionId,

//     supplier,

//     status: "processing",
//   };
// };



import crypto from "crypto";

import {
  akbarHotelSearchAdapter,
} from "../adapters/akbar/hotelSearch/akbarHotelSearch.adapter.js";

import {
  createHotelSearchState,
  getActiveSearchId,
  cancelAndDeleteHotelSearch,
  failHotelSearch,
  getHotelSearchResults,
  getHotelSearchMeta,
} from "./hotelSearch.redis.service.js";

// =========================================================
// CONFIGURATION
// =========================================================

const supplierAdapters = {
  AKBAR: akbarHotelSearchAdapter,
};

const FIRST_RESULT_TIMEOUT_MS = 30000;
const RESULT_CHECK_INTERVAL_MS = 300;

// =========================================================
// HELPERS
// =========================================================

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// =========================================================
// START HOTEL SEARCH
// =========================================================

export const searchHotels = async ({
  payload,
  searchSessionId,
}) => {
  const supplier = "AKBAR";

  const adapter = supplierAdapters[supplier];

  if (!adapter) {
    throw new Error(
      `Hotel supplier not configured: ${supplier}`
    );
  }

  if (!searchSessionId) {
    throw new Error("Search session ID is required");
  }

  // 1. Find previous active search
  const previousSearchId =
    await getActiveSearchId(searchSessionId);

  // 2. Cancel previous search
  if (previousSearchId) {
    console.log(
      "🔄 PREVIOUS HOTEL SEARCH FOUND:",
      previousSearchId
    );

    await cancelAndDeleteHotelSearch(
      previousSearchId,
      searchSessionId
    );
  }

  // 3. Generate internal search ID
  const searchId = crypto.randomUUID();

  // 4. Initialize Redis state
  await createHotelSearchState({
    searchId,
    searchSessionId,
    supplier,
  });

  console.log("🚀 NEW HOTEL SEARCH:", searchId);

  // 5. Start supplier search in background
  setImmediate(() => {
    adapter
      .search(payload, {
        internalSearchId: searchId,
        searchSessionId,
      })
      .catch(async (error) => {
        console.error(
          "❌ BACKGROUND HOTEL SEARCH FAILED:",
          error
        );

        try {
          await failHotelSearch(searchId, error);
        } catch (redisError) {
          console.error(
            "❌ FAILED TO UPDATE REDIS SEARCH ERROR:",
            redisError
          );
        }
      });
  });

  // 6. Wait for the first matched hotel
  //    Do not wait for the complete supplier search.
  const deadline =
    Date.now() + FIRST_RESULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const hotels = await getHotelSearchResults(searchId);

    const meta = await getHotelSearchMeta(searchId);

    // Return as soon as at least one matched hotel
    // has been published to Redis.
    if (hotels.length > 0) {
      console.log(
        "✅ FIRST MATCHED HOTEL AVAILABLE:",
        searchId,
        "Count:",
        hotels.length
      );

      return {
        searchId,
        searchSessionId,
        supplier,
        status: meta?.status || "processing",
        availableHotels: hotels.length,
      };
    }

    // Stop waiting if search has already ended
    // or failed without producing results.
    if (
      !meta ||
      ["completed", "failed", "cancelled"].includes(
        meta.status
      )
    ) {
      return {
        searchId,
        searchSessionId,
        supplier,
        status: meta?.status || "failed",
        availableHotels: 0,
        error: meta?.error || null,
      };
    }

    await sleep(RESULT_CHECK_INTERVAL_MS);
  }

  // 7. Safety fallback: never keep the POST request
  //    waiting indefinitely if the supplier is slow.
  const meta = await getHotelSearchMeta(searchId);
  const hotels = await getHotelSearchResults(searchId);

  console.warn(
    "⏳ FIRST HOTEL RESULT WAIT TIMED OUT:",
    searchId
  );

  return {
    searchId,
    searchSessionId,
    supplier,
    status: meta?.status || "processing",
    availableHotels: hotels.length,
    error: meta?.error || null,
  };
};
