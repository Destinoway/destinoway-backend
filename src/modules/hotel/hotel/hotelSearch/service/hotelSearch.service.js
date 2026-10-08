import crypto from "crypto";

import {
  akbarHotelSearchAdapter,
} from "../adapters/akbar/hotelSearch/akbarHotelSearch.adapter.js";

import {
  createHotelSearchState,
  getUserActiveSearchId,
  cancelAndDeleteHotelSearch,
  failHotelSearch,
} from "./hotelSearch.redis.service.js";


const supplierAdapters = {
  AKBAR: akbarHotelSearchAdapter,
};


export const searchHotels = async ({
  payload,
  userId,
}) => {

  const supplier = "AKBAR";

  const adapter =
    supplierAdapters[supplier];


  if (!adapter) {
    throw new Error(
      `Hotel supplier not configured: ${supplier}`
    );
  }


  if (!userId) {
    throw new Error(
      "User ID is required for hotel search"
    );
  }


  // =====================================================
  // 1. FIND PREVIOUS ACTIVE SEARCH
  // =====================================================

  const previousSearchId =
    await getUserActiveSearchId(
      userId
    );


  if (previousSearchId) {

    console.log(
      "🔄 PREVIOUS ACTIVE SEARCH FOUND:",
      previousSearchId
    );


    await cancelAndDeleteHotelSearch(
      previousSearchId
    );
  }


  // =====================================================
  // 2. CREATE NEW INTERNAL SEARCH ID
  // =====================================================

  const searchId =
    crypto.randomUUID();


  // =====================================================
  // 3. CREATE REDIS STATE
  // =====================================================

  await createHotelSearchState({
    searchId,
    userId,
    supplier,
  });


  // =====================================================
  // 4. START BACKGROUND SEARCH
  // =====================================================

  setImmediate(() => {

    adapter
      .search(
        payload,
        {
          internalSearchId:
            searchId,
        }
      )
      .catch(
        async (error) => {

          console.error(
            "❌ BACKGROUND HOTEL SEARCH FAILED:",
            error
          );


          try {

            await failHotelSearch(
              searchId,
              error
            );

          } catch (
            redisError
          ) {

            console.error(
              "❌ FAILED TO UPDATE REDIS ERROR:",
              redisError
            );
          }
        }
      );
  });


  // =====================================================
  // 5. RETURN IMMEDIATELY
  // =====================================================

  return {
    searchId,

    supplier,

    status:
      "processing",
  };
};