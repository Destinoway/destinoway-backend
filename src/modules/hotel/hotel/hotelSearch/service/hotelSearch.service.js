import crypto from "crypto";

import {
  akbarHotelSearchAdapter,
} from "../adapters/akbar/hotelSearch/akbarHotelSearch.adapter.js";

import {
  createHotelSearchState,
  failHotelSearch,
} from "./hotelSearch.redis.service.js";

const supplierAdapters = {
  AKBAR: akbarHotelSearchAdapter,
};

export const searchHotels = async (payload) => {
  const supplier = "AKBAR";

  const adapter = supplierAdapters[supplier];

  if (!adapter) {
    throw new Error(
      `Hotel supplier not configured: ${supplier}`
    );
  }

  /**
   * Internal search ID
   *
   * This ID is exposed to frontend.
   * Supplier's actual AKBAR searchId remains backend-only.
   */
  const searchId = crypto.randomUUID();

  /**
   * Create Redis search state first.
   */
  await createHotelSearchState({
    searchId,
    supplier,
  });

  /**
   * Start supplier search in background.
   *
   * Important:
   * We DO NOT await this.
   */
  setImmediate(() => {
    adapter
      .search(payload, {
        internalSearchId: searchId,
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

  /**
   * Return immediately to frontend.
   */
  return {
    searchId,
    supplier,
    status: "processing",
  };
};