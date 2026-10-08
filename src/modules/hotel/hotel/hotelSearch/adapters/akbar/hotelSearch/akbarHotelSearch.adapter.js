// import { akbarInitAPI } from "./api/akbarInit.api.js";
// import { akbarHotelContentAPI } from "./api/akbarHotelContent.api.js";
// import { akbarHotelRateAPI } from "./api/akbarHotelRate.api.js";

// import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";
// import { mapAkbarHotelContentResponse } from "./mappers/akbarHotelContent.response.mapper.js";
// import { mapAkbarHotelRateResponse } from "./mappers/akbarHotelRate.response.mapper.js";

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

//     const initPayload = mapAkbarInitRequest(payload);

//     const mappingEnd = performance.now();

//     console.log(
//       `⏱️ INIT REQUEST MAPPING TIME: ${(mappingEnd - mappingStart).toFixed(2)} ms`
//     );

//     // ========================================
//     // INIT API
//     // ========================================

//     const initResponse = await akbarInitAPI(initPayload);

//     if (!initResponse?.searchId) {
//       throw new Error("AKBAR Init failed: searchId not received");
//     }

//     const searchContext = {
//       searchId: initResponse.searchId,
//       searchTracingKey: initResponse.searchTracingKey,
//     };

//     // ========================================
//     // CONTENT + RATE
//     // ========================================

//     const contentRateStart = performance.now();

//     const [contentResponse, rateResponse] = await Promise.all([
//       akbarHotelContentAPI(searchContext),
//       akbarHotelRateAPI(searchContext),
//     ]);

//     const contentRateEnd = performance.now();

//     console.log(
//       `⏱️ CONTENT + RATE TOTAL TIME: ${(contentRateEnd - contentRateStart).toFixed(2)} ms`
//     );

//     // ========================================
//     // SUPPLIER RESPONSE MAPPING
//     // ========================================

//     const contentMappingStart = performance.now();

//     const content =
//       mapAkbarHotelContentResponse(contentResponse);

//     const contentMappingEnd = performance.now();

//     console.log(
//       `⏱️ CONTENT MAPPING TIME: ${(contentMappingEnd - contentMappingStart).toFixed(2)} ms`
//     );

//     const rateMappingStart = performance.now();

//     const rates =
//       mapAkbarHotelRateResponse(rateResponse);

//     const rateMappingEnd = performance.now();

//     console.log(
//       `⏱️ RATE MAPPING TIME: ${(rateMappingEnd - rateMappingStart).toFixed(2)} ms`
//     );

//     // ========================================
//     // MERGE
//     // ========================================

//     const mergeStart = performance.now();

//     const hotels = mergeHotelContentAndRates(
//       content,
//       rates
//     );

//     const mergeEnd = performance.now();

//     console.log(
//       `⏱️ HOTEL MERGE TIME: ${(mergeEnd - mergeStart).toFixed(2)} ms`
//     );

//     // ========================================
//     // TOTAL SEARCH TIME
//     // ========================================

//     const totalEnd = performance.now();

//     console.log(
//       `⏱️ TOTAL AKBAR SEARCH TIME: ${(totalEnd - totalStart).toFixed(2)} ms`
//     );

//     return {
//       supplier: "AKBAR",
//       searchContext,
//       hotels,
//     };
//   },
// };

// const mergeHotelContentAndRates = (
//   content,
//   rates
// ) => {
//   const rateMap = new Map(
//     rates.map((hotel) => [
//       String(hotel.supplierHotelId),
//       hotel,
//     ])
//   );

//   return content.map((hotel) => ({
//     ...hotel,
//     rate:
//       rateMap.get(
//         String(hotel.supplierHotelId)
//       )?.rate || null,
//   }));
// };

import { akbarInitAPI } from "./api/akbarInit.api.js";
import {
  akbarHotelContentAPI,
} from "./api/akbarHotelContent.api.js";

import {
  akbarHotelRateAPIWithPolling,
} from "./api/akbarHotelRate.api.js";

import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";

import {
  mapAkbarHotelContentResponse,
} from "./mappers/akbarHotelContent.response.mapper.js";

import {
  mapAkbarHotelRateResponse,
} from "./mappers/akbarHotelRate.response.mapper.js";

export const akbarHotelSearchAdapter = {
  async search(payload) {
    // ========================================
    // TOTAL SEARCH TIMER START
    // ========================================

    const totalStart = performance.now();

    // ========================================
    // REQUEST MAPPING
    // ========================================

    const mappingStart = performance.now();

    const initPayload =
      mapAkbarInitRequest(payload);

    const mappingEnd = performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(
        mappingEnd - mappingStart
      ).toFixed(2)} ms`
    );

    // ========================================
    // INIT API
    // ========================================

    const initResponse =
      await akbarInitAPI(initPayload);

    if (!initResponse?.searchId) {
      throw new Error(
        "AKBAR Init failed: searchId not received"
      );
    }

    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey:
        initResponse.searchTracingKey,
    };

    console.log(
      "========== AKBAR SEARCH CONTEXT =========="
    );

    console.log(
      "Search ID:",
      searchContext.searchId
    );

    console.log(
      "Search Tracing Key:",
      searchContext.searchTracingKey
    );

    console.log(
      "==========================================="
    );

    // ========================================
    // CONTENT #1 + RATE POLLING
    //
    // BOTH START IN PARALLEL
    // ========================================

    const parallelStart =
      performance.now();

    console.log(
      "========== AKBAR CONTENT #1 + RATE START =========="
    );

    const content1Promise =
      akbarHotelContentAPI({
        ...searchContext,

        // First Content request
        limit: 50,
        offset: -1,
      });

    const ratePromise =
      akbarHotelRateAPIWithPolling(
        searchContext
      );

    // ========================================
    // WAIT FOR CONTENT #1
    // ========================================

    const content1Response =
      await content1Promise;

    const content1Hotels =
      content1Response?.hotels || [];

    console.log(
      "========== AKBAR CONTENT #1 COMPLETE =========="
    );

    console.log(
      "CONTENT #1 HOTEL COUNT:",
      content1Hotels.length
    );

    console.log(
      "CONTENT #1 TOTAL:",
      content1Response?.total ?? null
    );

    // ========================================
    // CONTENT #2
    //
    // IMPORTANT:
    // DO NOT WAIT FOR RATE.
    //
    // As soon as Content #1 is complete,
    // immediately start Content #2.
    // ========================================

    console.log(
      "========== AKBAR CONTENT #2 START =========="
    );

    const content2Promise =
      akbarHotelContentAPI({
        ...searchContext,

        // Observed Akbar live pagination
        limit: 2500,
        offset: 50,
      });

    // ========================================
    // NOW WAIT FOR:
    //
    // Content #2
    // AND
    // Rate polling
    //
    // Both are already running.
    // ========================================

    const [
      content2Response,
      rateResponse,
    ] = await Promise.all([
      content2Promise,
      ratePromise,
    ]);

    const parallelEnd =
      performance.now();

    console.log(
      `⏱️ CONTENT #1 + CONTENT #2 + RATE TOTAL TIME: ${(
        parallelEnd - parallelStart
      ).toFixed(2)} ms`
    );

    // ========================================
    // CONTENT RESPONSE COUNTS
    // ========================================

    const content2Hotels =
      content2Response?.hotels || [];

    console.log(
      "========== AKBAR CONTENT RESULTS =========="
    );

    console.log(
      "CONTENT #1 COUNT:",
      content1Hotels.length
    );

    console.log(
      "CONTENT #2 COUNT:",
      content2Hotels.length
    );

    console.log(
      "CONTENT #1 TOTAL:",
      content1Response?.total ?? null
    );

    console.log(
      "CONTENT #2 TOTAL:",
      content2Response?.total ?? null
    );

    console.log(
      "============================================"
    );

    // ========================================
    // COMBINE CONTENT
    // ========================================

    const combineStart =
      performance.now();

    const allContentHotels = [
      ...content1Hotels,
      ...content2Hotels,
    ];

    console.log(
      "TOTAL RAW CONTENT HOTELS:",
      allContentHotels.length
    );

    // ========================================
    // DEDUPE CONTENT BY SUPPLIER HOTEL ID
    // ========================================

    const contentHotelMap =
      new Map();

    for (const hotel of allContentHotels) {
      const hotelId =
        hotel?.id;

      if (!hotelId) {
        continue;
      }

      const key = String(hotelId);

      if (!contentHotelMap.has(key)) {
        contentHotelMap.set(
          key,
          hotel
        );
      }
    }

    const uniqueContentHotels =
      Array.from(
        contentHotelMap.values()
      );

    const combineEnd =
      performance.now();

    console.log(
      `⏱️ CONTENT COMBINE + DEDUPE TIME: ${(
        combineEnd - combineStart
      ).toFixed(2)} ms`
    );

    console.log(
      "UNIQUE CONTENT HOTEL COUNT:",
      uniqueContentHotels.length
    );

    // ========================================
    // MAP CONTENT
    // ========================================

    const contentMappingStart =
      performance.now();

    const content =
      mapAkbarHotelContentResponse({
        ...content1Response,

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

    // ========================================
    // MAP RATE
    // ========================================

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

    // ========================================
    // CONTENT / RATE DEBUG
    // ========================================

    console.log(
      "========== AKBAR CONTENT / RATE MATCH DEBUG =========="
    );

    console.log(
      "CONTENT HOTEL COUNT:",
      content.length
    );

    console.log(
      "RATE HOTEL COUNT:",
      rates.length
    );

    console.log(
      "RATE TOTAL:",
      rateResponse?.total ?? null
    );

    console.log(
      "CONTENT IDS:",
      content.slice(0, 10).map(
        (hotel) => ({
          supplierHotelId:
            hotel.supplierHotelId,

          name:
            hotel.name,
        })
      )
    );

    console.log(
      "RATE IDS:",
      rates.slice(0, 10).map(
        (hotel) => ({
          supplierHotelId:
            hotel.supplierHotelId,

          total:
            hotel.rate?.total ??
            null,
        })
      )
    );

    const rateIdSet =
      new Set(
        rates.map(
          (hotel) =>
            String(
              hotel.supplierHotelId
            )
        )
      );

    console.log(
      "CONTENT/RATE MATCH RESULT:",
      content.slice(0, 10).map(
        (hotel) => ({
          supplierHotelId:
            hotel.supplierHotelId,

          name:
            hotel.name,

          hasRateMatch:
            rateIdSet.has(
              String(
                hotel.supplierHotelId
              )
            ),
        })
      )
    );

    console.log(
      "======================================================"
    );

    // ========================================
    // MERGE
    // ========================================

    const mergeStart =
      performance.now();

    const hotels =
      mergeHotelContentAndRates(
        content,
        rates
      );

    const mergeEnd =
      performance.now();

    console.log(
      `⏱️ HOTEL MERGE TIME: ${(
        mergeEnd - mergeStart
      ).toFixed(2)} ms`
    );

    // ========================================
    // FINAL RATE DEBUG
    // ========================================

    console.log(
      "========== FINAL HOTEL RATE DEBUG =========="
    );

    console.log(
      "FINAL HOTEL COUNT:",
      hotels.length
    );

    console.log(
      hotels.slice(0, 10).map(
        (hotel) => ({
          supplierHotelId:
            hotel.supplierHotelId,

          name:
            hotel.name,

          rate:
            hotel.rate,

          total:
            hotel.rate?.total ??
            null,
        })
      )
    );

    console.log(
      "============================================"
    );

    // ========================================
    // TOTAL SEARCH TIME
    // ========================================

    const totalEnd =
      performance.now();

    console.log(
      `⏱️ TOTAL AKBAR SEARCH TIME: ${(
        totalEnd - totalStart
      ).toFixed(2)} ms`
    );

    return {
      supplier: "AKBAR",

      searchContext,

      hotels,
    };
  },
};

// ========================================
// MERGE CONTENT + RATE
// ========================================
//
// IMPORTANT:
// Only hotels which have a rate are returned.
//
// Content-only hotels are removed.
// ========================================

const mergeHotelContentAndRates = (
  content,
  rates
) => {
  const rateMap =
    new Map(
      rates
        .filter(
          (hotel) =>
            hotel?.supplierHotelId &&
            hotel?.rate
        )
        .map(
          (hotel) => [
            String(
              hotel.supplierHotelId
            ),

            hotel.rate,
          ]
        )
    );

  const mergedHotels =
    content
      .map((hotel) => {
        const rate =
          rateMap.get(
            String(
              hotel.supplierHotelId
            )
          );

        // No rate = don't show hotel
        if (!rate) {
          return null;
        }

        return {
          ...hotel,

          rate,
        };
      })
      .filter(Boolean);

  console.log(
    "========== HOTEL MERGE SUMMARY =========="
  );

  console.log(
    "CONTENT HOTELS:",
    content.length
  );

  console.log(
    "RATE HOTELS:",
    rates.length
  );

  console.log(
    "FINAL RATE-AVAILABLE HOTELS:",
    mergedHotels.length
  );

  console.log(
    "REMOVED NO-RATE HOTELS:",
    content.length -
      mergedHotels.length
  );

  console.log(
    "=========================================="
  );

  return mergedHotels;
};