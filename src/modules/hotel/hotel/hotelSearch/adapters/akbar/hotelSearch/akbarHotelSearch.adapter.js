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
import { akbarHotelContentAPI } from "./api/akbarHotelContent.api.js";
import { akbarHotelRateAPI } from "./api/akbarHotelRate.api.js";

import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";
import { mapAkbarHotelContentResponse } from "./mappers/akbarHotelContent.response.mapper.js";
import { mapAkbarHotelRateResponse } from "./mappers/akbarHotelRate.response.mapper.js";

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

    const initPayload = mapAkbarInitRequest(payload);

    const mappingEnd = performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(mappingEnd - mappingStart).toFixed(2)} ms`
    );

    // ========================================
    // INIT API
    // ========================================

    const initResponse = await akbarInitAPI(initPayload);

    if (!initResponse?.searchId) {
      throw new Error("AKBAR Init failed: searchId not received");
    }

    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey: initResponse.searchTracingKey,
    };

    // ========================================
    // CONTENT + RATE
    // ========================================

    const contentRateStart = performance.now();

    const [contentResponse, rateResponse] = await Promise.all([
      akbarHotelContentAPI(searchContext),
      akbarHotelRateAPI(searchContext),
    ]);

    const contentRateEnd = performance.now();

    console.log(
      `⏱️ CONTENT + RATE TOTAL TIME: ${(contentRateEnd - contentRateStart).toFixed(2)} ms`
    );

    // ========================================
    // SUPPLIER RESPONSE MAPPING
    // ========================================

    const contentMappingStart = performance.now();

    const content =
      mapAkbarHotelContentResponse(contentResponse);

    const contentMappingEnd = performance.now();

    console.log(
      `⏱️ CONTENT MAPPING TIME: ${(contentMappingEnd - contentMappingStart).toFixed(2)} ms`
    );

    const rateMappingStart = performance.now();

    const rates =
      mapAkbarHotelRateResponse(rateResponse);

    const rateMappingEnd = performance.now();

    console.log(
      `⏱️ RATE MAPPING TIME: ${(rateMappingEnd - rateMappingStart).toFixed(2)} ms`
    );

    // ========================================
    // ID MATCH DEBUG
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
      "CONTENT IDS:",
      content.slice(0, 10).map((hotel) => ({
        supplierHotelId: hotel.supplierHotelId,
        name: hotel.name,
      }))
    );

    console.log(
      "RATE IDS:",
      rates.slice(0, 10).map((hotel) => ({
        supplierHotelId: hotel.supplierHotelId,
        total: hotel.rate?.total ?? null,
      }))
    );

    // Check whether first 10 content hotels have matching rates
    const rateIdSet = new Set(
      rates.map((hotel) =>
        String(hotel.supplierHotelId)
      )
    );

    console.log(
      "CONTENT/RATE MATCH RESULT:",
      content.slice(0, 10).map((hotel) => ({
        supplierHotelId: hotel.supplierHotelId,
        name: hotel.name,
        hasRateMatch: rateIdSet.has(
          String(hotel.supplierHotelId)
        ),
      }))
    );

    console.log(
      "======================================================"
    );

    // ========================================
    // MERGE
    // ========================================

    const mergeStart = performance.now();

    const hotels = mergeHotelContentAndRates(
      content,
      rates
    );

    const mergeEnd = performance.now();

    console.log(
      `⏱️ HOTEL MERGE TIME: ${(mergeEnd - mergeStart).toFixed(2)} ms`
    );

    // ========================================
    // FINAL RATE DEBUG
    // ========================================

    console.log(
      "========== FINAL HOTEL RATE DEBUG =========="
    );

    console.log(
      hotels.slice(0, 10).map((hotel) => ({
        supplierHotelId: hotel.supplierHotelId,
        name: hotel.name,
        rate: hotel.rate,
        total: hotel.rate?.total ?? null,
      }))
    );

    console.log(
      "============================================"
    );

    // ========================================
    // TOTAL SEARCH TIME
    // ========================================

    const totalEnd = performance.now();

    console.log(
      `⏱️ TOTAL AKBAR SEARCH TIME: ${(totalEnd - totalStart).toFixed(2)} ms`
    );

    return {
      supplier: "AKBAR",
      searchContext,
      hotels,
    };
  },
};

const mergeHotelContentAndRates = (
  content,
  rates
) => {
  const rateMap = new Map(
    rates.map((hotel) => [
      String(hotel.supplierHotelId),
      hotel,
    ])
  );

  return content.map((hotel) => ({
    ...hotel,
    rate:
      rateMap.get(
        String(hotel.supplierHotelId)
      )?.rate || null,
  }));
};