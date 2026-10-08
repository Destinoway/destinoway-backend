import crypto from "crypto";

import {
  akbarHotelSearchAdapter,
} from "../adapters/akbar/hotelSearch/akbarHotelSearch.adapter.js";

import {
  createHotelSearchState,
  getActiveSearchId,
  cancelAndDeleteHotelSearch,
  failHotelSearch,
} from "./hotelSearch.redis.service.js";

// =========================================================
// SUPPLIER ADAPTERS
// =========================================================

const supplierAdapters = {
  AKBAR: akbarHotelSearchAdapter,
};

// =========================================================
// START HOTEL SEARCH
// =========================================================

export const searchHotels = async ({
  payload,
  searchSessionId,
}) => {
  const supplier = "AKBAR";

  const adapter =
    supplierAdapters[supplier];

  if (!adapter) {
    throw new Error(
      `Hotel supplier not configured: ${supplier}`
    );
  }

  if (!searchSessionId) {
    throw new Error(
      "Search session ID is required"
    );
  }

  // =======================================================
  // 1. FIND PREVIOUS ACTIVE SEARCH
  // =======================================================

  const previousSearchId =
    await getActiveSearchId(
      searchSessionId
    );

  // =======================================================
  // 2. CANCEL PREVIOUS SEARCH
  // =======================================================

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

  // =======================================================
  // 3. CREATE NEW INTERNAL SEARCH ID
  // =======================================================

  const searchId =
    crypto.randomUUID();

  // =======================================================
  // 4. CREATE REDIS STATE
  // =======================================================

  await createHotelSearchState({
    searchId,
    searchSessionId,
    supplier,
  });

  console.log(
    "🚀 NEW HOTEL SEARCH:",
    searchId
  );

  // =======================================================
  // 5. START BACKGROUND SEARCH
  // =======================================================

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
          await failHotelSearch(
            searchId,
            error
          );
        } catch (redisError) {
          console.error(
            "❌ FAILED TO UPDATE REDIS SEARCH ERROR:",
            redisError
          );
        }
      });
  });

  // =======================================================
  // 6. RETURN IMMEDIATELY
  // =======================================================

  return {
    searchId,

    searchSessionId,

    supplier,

    status: "processing",
  };
};