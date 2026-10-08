
// import { akbarInitAPI } from "./api/akbarInit.api.js";
// import {
//   akbarHotelContentAPI,
// } from "./api/akbarHotelContent.api.js";

// import {
//   akbarHotelRateAPIWithPolling,
// } from "./api/akbarHotelRate.api.js";

// import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";

// import {
//   mapAkbarHotelContentResponse,
// } from "./mappers/akbarHotelContent.response.mapper.js";

// import {
//   mapAkbarHotelRateResponse,
// } from "./mappers/akbarHotelRate.response.mapper.js";

// export const akbarHotelSearchAdapter = {
//   async search(payload) {
//     // ========================================
//     // TOTAL SEARCH TIMER START
//     // ========================================

//     const totalStart = performance.now();

//     // ========================================
//     // REQUEST MAPPING
//     // ========================================

//     const mappingStart = performance.now();

//     const initPayload =
//       mapAkbarInitRequest(payload);

//     const mappingEnd = performance.now();

//     console.log(
//       `⏱️ INIT REQUEST MAPPING TIME: ${(
//         mappingEnd - mappingStart
//       ).toFixed(2)} ms`
//     );

//     // ========================================
//     // INIT API
//     // ========================================

//     const initResponse =
//       await akbarInitAPI(initPayload);

//     if (!initResponse?.searchId) {
//       throw new Error(
//         "AKBAR Init failed: searchId not received"
//       );
//     }

//     const searchContext = {
//       searchId: initResponse.searchId,
//       searchTracingKey:
//         initResponse.searchTracingKey,
//     };

//     console.log(
//       "========== AKBAR SEARCH CONTEXT =========="
//     );

//     console.log(
//       "Search ID:",
//       searchContext.searchId
//     );

//     console.log(
//       "Search Tracing Key:",
//       searchContext.searchTracingKey
//     );

//     console.log(
//       "==========================================="
//     );

//     // ========================================
//     // CONTENT #1 + RATE POLLING
//     //
//     // BOTH START IN PARALLEL
//     // ========================================

//     const parallelStart =
//       performance.now();

//     console.log(
//       "========== AKBAR CONTENT #1 + RATE START =========="
//     );

//     const content1Promise =
//       akbarHotelContentAPI({
//         ...searchContext,

//         // First Content request
//         limit: 50,
//         offset: -1,
//       });

//     const ratePromise =
//       akbarHotelRateAPIWithPolling(
//         searchContext
//       );

//     // ========================================
//     // WAIT FOR CONTENT #1
//     // ========================================

//     const content1Response =
//       await content1Promise;

//     const content1Hotels =
//       content1Response?.hotels || [];

//     console.log(
//       "========== AKBAR CONTENT #1 COMPLETE =========="
//     );

//     console.log(
//       "CONTENT #1 HOTEL COUNT:",
//       content1Hotels.length
//     );

//     console.log(
//       "CONTENT #1 TOTAL:",
//       content1Response?.total ?? null
//     );

//     // ========================================
//     // CONTENT #2
//     //
//     // IMPORTANT:
//     // DO NOT WAIT FOR RATE.
//     //
//     // As soon as Content #1 is complete,
//     // immediately start Content #2.
//     // ========================================

//     console.log(
//       "========== AKBAR CONTENT #2 START =========="
//     );

//     const content2Promise =
//       akbarHotelContentAPI({
//         ...searchContext,

//         // Observed Akbar live pagination
//         limit: 2500,
//         offset: 50,
//       });

//     // ========================================
//     // NOW WAIT FOR:
//     //
//     // Content #2
//     // AND
//     // Rate polling
//     //
//     // Both are already running.
//     // ========================================

//     const [
//       content2Response,
//       rateResponse,
//     ] = await Promise.all([
//       content2Promise,
//       ratePromise,
//     ]);

//     const parallelEnd =
//       performance.now();

//     console.log(
//       `⏱️ CONTENT #1 + CONTENT #2 + RATE TOTAL TIME: ${(
//         parallelEnd - parallelStart
//       ).toFixed(2)} ms`
//     );

//     // ========================================
//     // CONTENT RESPONSE COUNTS
//     // ========================================

//     const content2Hotels =
//       content2Response?.hotels || [];

//     console.log(
//       "========== AKBAR CONTENT RESULTS =========="
//     );

//     console.log(
//       "CONTENT #1 COUNT:",
//       content1Hotels.length
//     );

//     console.log(
//       "CONTENT #2 COUNT:",
//       content2Hotels.length
//     );

//     console.log(
//       "CONTENT #1 TOTAL:",
//       content1Response?.total ?? null
//     );

//     console.log(
//       "CONTENT #2 TOTAL:",
//       content2Response?.total ?? null
//     );

//     console.log(
//       "============================================"
//     );

//     // ========================================
//     // COMBINE CONTENT
//     // ========================================

//     const combineStart =
//       performance.now();

//     const allContentHotels = [
//       ...content1Hotels,
//       ...content2Hotels,
//     ];

//     console.log(
//       "TOTAL RAW CONTENT HOTELS:",
//       allContentHotels.length
//     );

//     // ========================================
//     // DEDUPE CONTENT BY SUPPLIER HOTEL ID
//     // ========================================

//     const contentHotelMap =
//       new Map();

//     for (const hotel of allContentHotels) {
//       const hotelId =
//         hotel?.id;

//       if (!hotelId) {
//         continue;
//       }

//       const key = String(hotelId);

//       if (!contentHotelMap.has(key)) {
//         contentHotelMap.set(
//           key,
//           hotel
//         );
//       }
//     }

//     const uniqueContentHotels =
//       Array.from(
//         contentHotelMap.values()
//       );

//     const combineEnd =
//       performance.now();

//     console.log(
//       `⏱️ CONTENT COMBINE + DEDUPE TIME: ${(
//         combineEnd - combineStart
//       ).toFixed(2)} ms`
//     );

//     console.log(
//       "UNIQUE CONTENT HOTEL COUNT:",
//       uniqueContentHotels.length
//     );

//     // ========================================
//     // MAP CONTENT
//     // ========================================

//     const contentMappingStart =
//       performance.now();

//     const content =
//       mapAkbarHotelContentResponse({
//         ...content1Response,

//         hotels: uniqueContentHotels,
//       });

//     const contentMappingEnd =
//       performance.now();

//     console.log(
//       `⏱️ CONTENT MAPPING TIME: ${(
//         contentMappingEnd -
//         contentMappingStart
//       ).toFixed(2)} ms`
//     );

//     // ========================================
//     // MAP RATE
//     // ========================================

//     const rateMappingStart =
//       performance.now();

//     const rates =
//       mapAkbarHotelRateResponse(
//         rateResponse
//       );

//     const rateMappingEnd =
//       performance.now();

//     console.log(
//       `⏱️ RATE MAPPING TIME: ${(
//         rateMappingEnd -
//         rateMappingStart
//       ).toFixed(2)} ms`
//     );

//     // ========================================
//     // CONTENT / RATE DEBUG
//     // ========================================

//     console.log(
//       "========== AKBAR CONTENT / RATE MATCH DEBUG =========="
//     );

//     console.log(
//       "CONTENT HOTEL COUNT:",
//       content.length
//     );

//     console.log(
//       "RATE HOTEL COUNT:",
//       rates.length
//     );

//     console.log(
//       "RATE TOTAL:",
//       rateResponse?.total ?? null
//     );

//     console.log(
//       "CONTENT IDS:",
//       content.slice(0, 10).map(
//         (hotel) => ({
//           supplierHotelId:
//             hotel.supplierHotelId,

//           name:
//             hotel.name,
//         })
//       )
//     );

//     console.log(
//       "RATE IDS:",
//       rates.slice(0, 10).map(
//         (hotel) => ({
//           supplierHotelId:
//             hotel.supplierHotelId,

//           total:
//             hotel.rate?.total ??
//             null,
//         })
//       )
//     );

//     const rateIdSet =
//       new Set(
//         rates.map(
//           (hotel) =>
//             String(
//               hotel.supplierHotelId
//             )
//         )
//       );

//     console.log(
//       "CONTENT/RATE MATCH RESULT:",
//       content.slice(0, 10).map(
//         (hotel) => ({
//           supplierHotelId:
//             hotel.supplierHotelId,

//           name:
//             hotel.name,

//           hasRateMatch:
//             rateIdSet.has(
//               String(
//                 hotel.supplierHotelId
//               )
//             ),
//         })
//       )
//     );

//     console.log(
//       "======================================================"
//     );

//     // ========================================
//     // MERGE
//     // ========================================

//     const mergeStart =
//       performance.now();

//     const hotels =
//       mergeHotelContentAndRates(
//         content,
//         rates
//       );

//     const mergeEnd =
//       performance.now();

//     console.log(
//       `⏱️ HOTEL MERGE TIME: ${(
//         mergeEnd - mergeStart
//       ).toFixed(2)} ms`
//     );

//     // ========================================
//     // FINAL RATE DEBUG
//     // ========================================

//     console.log(
//       "========== FINAL HOTEL RATE DEBUG =========="
//     );

//     console.log(
//       "FINAL HOTEL COUNT:",
//       hotels.length
//     );

//     console.log(
//       hotels.slice(0, 10).map(
//         (hotel) => ({
//           supplierHotelId:
//             hotel.supplierHotelId,

//           name:
//             hotel.name,

//           rate:
//             hotel.rate,

//           total:
//             hotel.rate?.total ??
//             null,
//         })
//       )
//     );

//     console.log(
//       "============================================"
//     );

//     // ========================================
//     // TOTAL SEARCH TIME
//     // ========================================

//     const totalEnd =
//       performance.now();

//     console.log(
//       `⏱️ TOTAL AKBAR SEARCH TIME: ${(
//         totalEnd - totalStart
//       ).toFixed(2)} ms`
//     );

//     return {
//       supplier: "AKBAR",

//       searchContext,

//       hotels,
//     };
//   },
// };

// // ========================================
// // MERGE CONTENT + RATE
// // ========================================
// //
// // IMPORTANT:
// // Only hotels which have a rate are returned.
// //
// // Content-only hotels are removed.
// // ========================================

// const mergeHotelContentAndRates = (
//   content,
//   rates
// ) => {
//   const rateMap =
//     new Map(
//       rates
//         .filter(
//           (hotel) =>
//             hotel?.supplierHotelId &&
//             hotel?.rate
//         )
//         .map(
//           (hotel) => [
//             String(
//               hotel.supplierHotelId
//             ),

//             hotel.rate,
//           ]
//         )
//     );

//   const mergedHotels =
//     content
//       .map((hotel) => {
//         const rate =
//           rateMap.get(
//             String(
//               hotel.supplierHotelId
//             )
//           );

//         // No rate = don't show hotel
//         if (!rate) {
//           return null;
//         }

//         return {
//           ...hotel,

//           rate,
//         };
//       })
//       .filter(Boolean);

//   console.log(
//     "========== HOTEL MERGE SUMMARY =========="
//   );

//   console.log(
//     "CONTENT HOTELS:",
//     content.length
//   );

//   console.log(
//     "RATE HOTELS:",
//     rates.length
//   );

//   console.log(
//     "FINAL RATE-AVAILABLE HOTELS:",
//     mergedHotels.length
//   );

//   console.log(
//     "REMOVED NO-RATE HOTELS:",
//     content.length -
//       mergedHotels.length
//   );

//   console.log(
//     "=========================================="
//   );

//   return mergedHotels;
// };


import { akbarInitAPI } from "./api/akbarInit.api.js";
import { akbarHotelContentAPI } from "./api/akbarHotelContent.api.js";
import {
  akbarHotelRateAPIWithPolling,
} from "./api/akbarHotelRate.api.js";

import {
  mapAkbarInitRequest,
} from "./mappers/akbarInit.request.mapper.js";

import {
  mapAkbarHotelContentResponse,
} from "./mappers/akbarHotelContent.response.mapper.js";

import {
  mapAkbarHotelRateResponse,
} from "./mappers/akbarHotelRate.response.mapper.js";

export const akbarHotelSearchAdapter = {
  async search(payload) {
    const totalStart = performance.now();

    // =========================================================
    // 1. MAP INIT REQUEST
    // =========================================================

    const mappingStart = performance.now();

    const initPayload = mapAkbarInitRequest(payload);

    const mappingEnd = performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(
        mappingEnd - mappingStart
      ).toFixed(2)} ms`
    );

    // =========================================================
    // 2. INIT
    // =========================================================

    const initResponse = await akbarInitAPI(initPayload);

    if (!initResponse?.searchId) {
      throw new Error(
        "AKBAR Init failed: searchId not received"
      );
    }

    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey: initResponse.searchTracingKey,
    };

    console.log("");
    console.log("==========================================");
    console.log("🔎 AKBAR SEARCH CONTEXT");
    console.log("==========================================");
    console.log("Search ID:", searchContext.searchId);
    console.log(
      "Search Tracing Key:",
      searchContext.searchTracingKey
    );

    // =========================================================
    // 3. START CONTENT #1 + RATE IN PARALLEL
    // =========================================================

    const contentRateStart = performance.now();

    console.log("");
    console.log("==========================================");
    console.log("🚀 STARTING CONTENT + RATE");
    console.log("==========================================");

    const content1Promise = akbarHotelContentAPI({
      ...searchContext,

      // Supplier documentation:
      // first content request must use 50 + offset -1
      limit: 50,
      offset: -1,
    });

    const ratePromise = akbarHotelRateAPIWithPolling(
      searchContext
    );

    // =========================================================
    // 4. WAIT ONLY FOR CONTENT #1
    // =========================================================

    const content1Response = await content1Promise;

    const content1Hotels =
      content1Response?.hotels || [];

    const totalContent =
      content1Response?.total ??
      content1Response?.Count ??
      content1Response?.count ??
      0;

    console.log("");
    console.log("==========================================");
    console.log("📄 CONTENT #1 COMPLETED");
    console.log("==========================================");

    console.log(
      "Content #1 Hotels:",
      content1Hotels.length
    );

    console.log(
      "Total Content Hotels:",
      totalContent
    );

    // =========================================================
    // 5. CONTENT PAGINATION
    // =========================================================

    const allContentHotels = [...content1Hotels];

    let currentOffset = 50;

    const CONTENT_PAGE_SIZE = 2500;

    while (
      totalContent > 0 &&
      allContentHotels.length < totalContent
    ) {
      const remaining =
        totalContent - allContentHotels.length;

      const currentLimit = Math.min(
        CONTENT_PAGE_SIZE,
        remaining
      );

      console.log("");
      console.log("==========================================");
      console.log("📄 AKBAR CONTENT NEXT PAGE");
      console.log("==========================================");

      console.log(
        "Current Hotels:",
        allContentHotels.length
      );

      console.log(
        "Remaining Hotels:",
        remaining
      );

      console.log(
        "Request Limit:",
        currentLimit
      );

      console.log(
        "Request Offset:",
        currentOffset
      );

      const contentResponse =
        await akbarHotelContentAPI({
          ...searchContext,

          limit: currentLimit,
          offset: currentOffset,
        });

      const hotels =
        contentResponse?.hotels || [];

      console.log(
        "Hotels Received:",
        hotels.length
      );

      // Safety check
      if (!hotels.length) {
        console.warn(
          "⚠️ AKBAR returned 0 hotels. Stopping pagination."
        );

        break;
      }

      allContentHotels.push(...hotels);

      currentOffset += hotels.length;

      console.log(
        "Total Hotels Collected:",
        allContentHotels.length
      );
    }

    // =========================================================
    // 6. WAIT FOR RATE TO COMPLETE
    // =========================================================

    console.log("");
    console.log("==========================================");
    console.log("⏳ WAITING FOR FINAL RATE RESPONSE");
    console.log("==========================================");

    const rateResponse = await ratePromise;

    const contentRateEnd = performance.now();

    console.log(
      `⏱️ CONTENT + RATE TOTAL TIME: ${(
        contentRateEnd - contentRateStart
      ).toFixed(2)} ms`
    );

    // =========================================================
    // 7. DEDUPLICATE CONTENT
    // =========================================================

    const uniqueContentHotels = Array.from(
      new Map(
        allContentHotels
          .filter((hotel) => hotel?.id)
          .map((hotel) => [
            String(hotel.id),
            hotel,
          ])
      ).values()
    );

    console.log("");
    console.log("==========================================");
    console.log("📦 CONTENT SUMMARY");
    console.log("==========================================");

    console.log(
      "Expected Content:",
      totalContent
    );

    console.log(
      "Raw Content:",
      allContentHotels.length
    );

    console.log(
      "Unique Content:",
      uniqueContentHotels.length
    );

    // =========================================================
    // 8. MAP CONTENT
    // =========================================================

    const contentMappingStart =
      performance.now();

    const content =
      mapAkbarHotelContentResponse({
        hotels: uniqueContentHotels,
      });

    const contentMappingEnd =
      performance.now();

    console.log(
      `⏱️ CONTENT MAPPING TIME: ${(
        contentMappingEnd -
        contentMappingStart
      ).toFixed(2)} ms`
    );

    // =========================================================
    // 9. MAP RATE
    // =========================================================

    const rateMappingStart =
      performance.now();

    const rates =
      mapAkbarHotelRateResponse(
        rateResponse
      );

    const rateMappingEnd =
      performance.now();

    console.log(
      `⏱️ RATE MAPPING TIME: ${(
        rateMappingEnd -
        rateMappingStart
      ).toFixed(2)} ms`
    );

    // =========================================================
    // 10. DEBUG CONTENT / RATE MATCH
    // =========================================================

    console.log("");
    console.log("==========================================");
    console.log("🔗 AKBAR CONTENT / RATE MATCH");
    console.log("==========================================");

    console.log(
      "CONTENT HOTEL COUNT:",
      content.length
    );

    console.log(
      "RATE HOTEL COUNT:",
      rates.length
    );

    const rateIdSet = new Set(
      rates
        .filter(
          (hotel) =>
            hotel?.supplierHotelId
        )
        .map((hotel) =>
          String(hotel.supplierHotelId)
        )
    );

    console.log(
      "CONTENT/RATE SAMPLE:",
      content
        .slice(0, 10)
        .map((hotel) => ({
          supplierHotelId:
            hotel.supplierHotelId,

          name: hotel.name,

          hasRateMatch:
            rateIdSet.has(
              String(
                hotel.supplierHotelId
              )
            ),
        }))
    );

    // =========================================================
    // 11. MERGE CONTENT + RATE
    // ONLY RATE AVAILABLE HOTELS
    // =========================================================

    const mergeStart = performance.now();

    const rateMap = new Map(
      rates
        .filter(
          (hotel) =>
            hotel?.supplierHotelId &&
            hotel?.rate
        )
        .map((hotel) => [
          String(
            hotel.supplierHotelId
          ),
          hotel.rate,
        ])
    );

    const mergedHotels = content
      .map((hotel) => {
        const rate = rateMap.get(
          String(
            hotel.supplierHotelId
          )
        );

        if (!rate) {
          return null;
        }

        return {
          ...hotel,
          rate,
        };
      })
      .filter(Boolean);

    const mergeEnd = performance.now();

    console.log(
      `⏱️ HOTEL MERGE TIME: ${(
        mergeEnd - mergeStart
      ).toFixed(2)} ms`
    );

    // =========================================================
    // 12. FINAL DEBUG
    // =========================================================

    console.log("");
    console.log("==========================================");
    console.log("🏨 FINAL AKBAR HOTEL RESULT");
    console.log("==========================================");

    console.log(
      "CONTENT HOTELS:",
      content.length
    );

    console.log(
      "RATE HOTELS:",
      rates.length
    );

    console.log(
      "RATE AVAILABLE HOTELS:",
      mergedHotels.length
    );

    console.log(
      "REMOVED NO-RATE HOTELS:",
      content.length -
        mergedHotels.length
    );

    console.log("");

    console.log(
      mergedHotels
        .slice(0, 10)
        .map((hotel) => ({
          supplierHotelId:
            hotel.supplierHotelId,

          name: hotel.name,

          total:
            hotel.rate?.total ??
            null,
        }))
    );

    // =========================================================
    // 13. TOTAL TIME
    // =========================================================

    const totalEnd = performance.now();

    console.log("");
    console.log("==========================================");
    console.log("⏱️ AKBAR SEARCH COMPLETE");
    console.log("==========================================");

    console.log(
      `TOTAL AKBAR SEARCH TIME: ${(
        totalEnd - totalStart
      ).toFixed(2)} ms`
    );

    // =========================================================
    // 14. FINAL COMMON RESPONSE
    // =========================================================

    return {
      supplier: "AKBAR",

      searchContext,

      hotels: mergedHotels,
    };
  },
};