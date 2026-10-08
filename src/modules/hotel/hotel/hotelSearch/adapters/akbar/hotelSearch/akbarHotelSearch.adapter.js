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

import {
  isHotelSearchActive,
  updateHotelSearchMeta,
  setHotelSearchResults,
  completeHotelSearch,
} from "../../../service/hotelSearch.redis.service.js";


// =========================================================
// AKBAR HOTEL SEARCH ADAPTER
// =========================================================

export const akbarHotelSearchAdapter = {
  async search(
    payload,
    {
      internalSearchId,
      searchSessionId,
    } = {}
  ) {
    const totalStart = performance.now();

    // =======================================================
    // VALIDATION
    // =======================================================

    if (!internalSearchId) {
      throw new Error(
        "Internal hotel search ID is required"
      );
    }

    if (!searchSessionId) {
      throw new Error(
        "Hotel search session ID is required"
      );
    }

    // =======================================================
    // SEARCH ACTIVE CHECK
    // =======================================================

    const ensureSearchIsActive = async () => {
      const active = await isHotelSearchActive(
        internalSearchId,
        searchSessionId
      );

      if (!active) {
        console.log("");
        console.log("==========================================");
        console.log("🛑 AKBAR SEARCH CANCELLED");
        console.log("==========================================");
        console.log(
          "Internal Search ID:",
          internalSearchId
        );

        return false;
      }

      return true;
    };

    // =======================================================
    // 1. CHECK SEARCH
    // =======================================================

    if (!(await ensureSearchIsActive())) {
      return;
    }

    // =======================================================
    // 2. MAP INIT REQUEST
    // =======================================================

    const mappingStart = performance.now();

    const initPayload =
      mapAkbarInitRequest(payload);

    const mappingEnd = performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(
        mappingEnd - mappingStart
      ).toFixed(2)} ms`
    );

    // =======================================================
    // 3. AKBAR INIT
    // =======================================================

    if (!(await ensureSearchIsActive())) {
      return;
    }

    const initResponse =
      await akbarInitAPI(initPayload);

    if (!initResponse?.searchId) {
      throw new Error(
        "AKBAR Init failed: searchId not received"
      );
    }

    // =======================================================
    // AKBAR SEARCH CONTEXT
    // =======================================================

    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey:
        initResponse.searchTracingKey,
    };

    console.log("");
    console.log("==========================================");
    console.log("🔎 AKBAR SEARCH CONTEXT");
    console.log("==========================================");

    console.log(
      "Internal Search ID:",
      internalSearchId
    );

    console.log(
      "Search Session ID:",
      searchSessionId
    );

    console.log(
      "Akbar Search ID:",
      searchContext.searchId
    );

    console.log(
      "Search Tracing Key:",
      searchContext.searchTracingKey
    );

    // =======================================================
    // 4. UPDATE REDIS
    // AKBAR INIT COMPLETED
    // =======================================================

    await updateHotelSearchMeta(
      internalSearchId,
      {
        akbarSearchId:
          searchContext.searchId,

        contentStatus:
          "processing",

        rateStatus:
          "inprogress",
      }
    );

    // =======================================================
    // 5. START CONTENT #1 + RATE IN PARALLEL
    // =======================================================

    const contentRateStart =
      performance.now();

    console.log("");
    console.log("==========================================");
    console.log("🚀 STARTING CONTENT + RATE");
    console.log("==========================================");

    // -------------------------------------------------------
    // CONTENT #1
    // -------------------------------------------------------

    const content1Promise =
      akbarHotelContentAPI({
        ...searchContext,

        // Supplier requirement:
        // first content request = 50 + offset -1
        limit: 50,
        offset: -1,
      });

    // -------------------------------------------------------
    // RATE POLLING
    // -------------------------------------------------------

    const ratePromise =
      akbarHotelRateAPIWithPolling(
        searchContext
      );

    // =======================================================
    // 6. WAIT FOR CONTENT #1
    // =======================================================

    const content1Response =
      await content1Promise;

    // Search may have been cancelled while
    // Akbar was processing Content #1.
    if (!(await ensureSearchIsActive())) {
      return;
    }

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

    // =======================================================
    // UPDATE REDIS
    // =======================================================

    await updateHotelSearchMeta(
      internalSearchId,
      {
        totalContent,
        contentStatus: "processing",
      }
    );

    // =======================================================
    // 7. CONTENT PAGINATION
    // =======================================================

    const allContentHotels = [
      ...content1Hotels,
    ];

    let currentOffset = 50;

    const CONTENT_PAGE_SIZE = 2500;

    while (
      totalContent > 0 &&
      allContentHotels.length < totalContent
    ) {
      // -----------------------------------------------------
      // IMPORTANT:
      // Check whether this search is still active.
      // If another search was started from the same browser,
      // this search will stop here.
      // -----------------------------------------------------

      if (!(await ensureSearchIsActive())) {
        return;
      }

      const remaining =
        totalContent -
        allContentHotels.length;

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

      // -----------------------------------------------------
      // CHECK AGAIN AFTER SUPPLIER REQUEST
      // -----------------------------------------------------

      if (!(await ensureSearchIsActive())) {
        return;
      }

      const hotels =
        contentResponse?.hotels || [];

      console.log(
        "Hotels Received:",
        hotels.length
      );

      // -----------------------------------------------------
      // SAFETY CHECK
      // -----------------------------------------------------

      if (!hotels.length) {
        console.warn(
          "⚠️ AKBAR returned 0 hotels. Stopping pagination."
        );

        break;
      }

      allContentHotels.push(
        ...hotels
      );

      currentOffset += hotels.length;

      console.log(
        "Total Hotels Collected:",
        allContentHotels.length
      );
    }

    // =======================================================
    // 8. CONTENT COMPLETED
    // =======================================================

    if (!(await ensureSearchIsActive())) {
      return;
    }

    console.log("");
    console.log("==========================================");
    console.log("📦 AKBAR CONTENT COMPLETED");
    console.log("==========================================");

    console.log(
      "Expected Content:",
      totalContent
    );

    console.log(
      "Raw Content:",
      allContentHotels.length
    );

    // =======================================================
    // UPDATE REDIS
    // =======================================================

    await updateHotelSearchMeta(
      internalSearchId,
      {
        contentStatus: "completed",
        totalContent:
          allContentHotels.length,
      }
    );

    // =======================================================
    // 9. WAIT FOR RATE TO COMPLETE
    // =======================================================

    console.log("");
    console.log("==========================================");
    console.log("⏳ WAITING FOR FINAL RATE RESPONSE");
    console.log("==========================================");

    const rateResponse =
      await ratePromise;

    // -------------------------------------------------------
    // IMPORTANT:
    // Rate may have completed after user started another
    // search. Don't save old search results.
    // -------------------------------------------------------

    if (!(await ensureSearchIsActive())) {
      return;
    }

    const contentRateEnd =
      performance.now();

    console.log(
      `⏱️ CONTENT + RATE TOTAL TIME: ${(
        contentRateEnd -
        contentRateStart
      ).toFixed(2)} ms`
    );

    // =======================================================
    // 10. DEDUPLICATE CONTENT
    // =======================================================

    const uniqueContentHotels =
      Array.from(
        new Map(
          allContentHotels
            .filter(
              (hotel) => hotel?.id
            )
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

    // =======================================================
    // 11. MAP CONTENT
    // =======================================================

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

    // =======================================================
    // 12. MAP RATE
    // =======================================================

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

    // =======================================================
    // 13. CONTENT / RATE MATCH
    // =======================================================

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

    const rateIdSet =
      new Set(
        rates
          .filter(
            (hotel) =>
              hotel?.supplierHotelId
          )
          .map(
            (hotel) =>
              String(
                hotel.supplierHotelId
              )
          )
      );

    console.log(
      "CONTENT/RATE SAMPLE:",
      content
        .slice(0, 10)
        .map((hotel) => ({
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
        }))
    );

    // =======================================================
    // 14. MERGE CONTENT + RATE
    // ONLY RATE AVAILABLE HOTELS
    // =======================================================

    const mergeStart =
      performance.now();

    const rateMap =
      new Map(
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
            hotel,
          ])
      );

    const mergedHotels =
      content
        .map((hotel) => {
          const rateHotel =
            rateMap.get(
              String(
                hotel.supplierHotelId
              )
            );

          if (!rateHotel?.rate) {
            return null;
          }

          return {
            ...hotel,

            rate:
              rateHotel.rate,

            isRecommended:
              rateHotel.isRecommended ??
              null,

            isRefundable:
              rateHotel.isRefundable ??
              null,

            moreRatesExpected:
              rateHotel.moreRatesExpected ??
              false,

            freeBreakfast:
              rateHotel.freeBreakfast ??
              null,

            payAtHotel:
              rateHotel.payAtHotel ??
              false,

            freeCancellation:
              rateHotel.freeCancellation ??
              false,

            currency:
              rateResponse?.currency ||
              "INR",

            rateSupplierData:
              rateHotel,
          };
        })
        .filter(Boolean);

    const mergeEnd =
      performance.now();

    console.log(
      `⏱️ HOTEL MERGE TIME: ${(
        mergeEnd - mergeStart
      ).toFixed(2)} ms`
    );

    // =======================================================
    // 15. FINAL ACTIVE CHECK
    // =======================================================

    if (!(await ensureSearchIsActive())) {
      return;
    }

    // =======================================================
    // 16. SAVE RESULTS TO REDIS
    // =======================================================

    await setHotelSearchResults(
      internalSearchId,
      mergedHotels
    );

    await updateHotelSearchMeta(
      internalSearchId,
      {
        rateStatus: "completed",

        availableHotels:
          mergedHotels.length,
      }
    );

    // =======================================================
    // 17. FINAL DEBUG
    // =======================================================

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

          name:
            hotel.name,

          total:
            hotel.rate?.total ??
            null,
        }))
    );

    // =======================================================
    // 18. COMPLETE SEARCH
    // =======================================================

    await completeHotelSearch(
      internalSearchId,
      {
        contentStatus:
          "completed",

        rateStatus:
          "completed",

        availableHotels:
          mergedHotels.length,
      }
    );

    // =======================================================
    // 19. TOTAL TIME
    // =======================================================

    const totalEnd =
      performance.now();

    console.log("");

    console.log("==========================================");
    console.log("⏱️ AKBAR SEARCH COMPLETE");
    console.log("==========================================");

    console.log(
      `TOTAL AKBAR SEARCH TIME: ${(
        totalEnd - totalStart
      ).toFixed(2)} ms`
    );

    // =======================================================
    // 20. FINAL COMMON RESPONSE
    // =======================================================

    return {
      supplier: "AKBAR",

      searchContext,

      internalSearchId,

      searchSessionId,

      hotels: mergedHotels,
    };
  },
};