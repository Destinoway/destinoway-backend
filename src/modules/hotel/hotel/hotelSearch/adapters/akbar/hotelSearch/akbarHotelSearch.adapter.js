import { akbarInitAPI } from "./api/akbarInit.api.js";

import { akbarHotelContentAPI } from "./api/akbarHotelContent.api.js";

import { akbarHotelRateAPIWithPolling } from "./api/akbarHotelRate.api.js";

import { mapAkbarInitRequest } from "./mappers/akbarInit.request.mapper.js";

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


export const akbarHotelSearchAdapter = {
  async search(
    payload,
    {
      internalSearchId,
      searchSessionId,
    } = {}
  ) {
    const totalStart = performance.now();


    // =========================================================
    // VALIDATION
    // =========================================================

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


    // =========================================================
    // SEARCH ACTIVE CHECK
    // =========================================================

    const ensureSearchIsActive = async () => {
      const active =
        await isHotelSearchActive(
          internalSearchId,
          searchSessionId
        );

      if (!active) {
        console.log(
          "🛑 AKBAR SEARCH CANCELLED:",
          internalSearchId
        );

        return false;
      }

      return true;
    };


    if (
      !(await ensureSearchIsActive())
    ) {
      return;
    }


    // =========================================================
    // 1. INIT
    // =========================================================

    const mappingStart =
      performance.now();

    const initPayload =
      mapAkbarInitRequest(payload);

    const mappingEnd =
      performance.now();


    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(mappingEnd - mappingStart).toFixed(2)} ms`
    );


    if (
      !(await ensureSearchIsActive())
    ) {
      return;
    }


    const initResponse =
      await akbarInitAPI(
        initPayload
      );


    if (!initResponse?.searchId) {
      throw new Error(
        "AKBAR Init failed: searchId not received"
      );
    }


    const searchContext = {
      searchId:
        initResponse.searchId,

      searchTracingKey:
        initResponse.searchTracingKey,
    };


    console.log(
      "🔎 AKBAR SEARCH CONTEXT",
      {
        internalSearchId,
        searchSessionId,

        akbarSearchId:
          searchContext.searchId,

        searchTracingKey:
          searchContext.searchTracingKey,
      }
    );


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


    // =========================================================
    // 2. LOCAL PROGRESSIVE STATE
    // =========================================================

    const contentMap =
      new Map();

    const rateMap =
      new Map();

    let latestRateResponse =
      null;

    let totalContent =
      0;


    // =========================================================
    // 3. BUILD MERGED HOTELS
    // =========================================================

    const buildMergedHotels = () => {
      const contentHotels =
        Array.from(
          contentMap.values()
        );


      return contentHotels
        .map((hotel) => {

          const rateHotel =
            rateMap.get(
              String(
                hotel.supplierHotelId
              )
            );


          // Only expose hotels
          // which have a rate.
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

            availableSuppliers:
              rateHotel.availableSuppliers ??
              [],

            currency:
              latestRateResponse?.currency ||
              "INR",

            rateSupplierData:
              rateHotel,
          };
        })
        .filter(Boolean);
    };


    // =========================================================
    // 4. SERIALIZE REDIS WRITES
    // =========================================================
    //
    // Content and Rate can update Redis at the same time.
    // Queue ensures Redis writes happen one-by-one.
    //

    let publishChain =
      Promise.resolve();


    const publishMatchedResults = (
      reason
    ) => {

      publishChain =
        publishChain.then(
          async () => {

            if (
              !(await ensureSearchIsActive())
            ) {
              return;
            }


            const mergedHotels =
              buildMergedHotels();


            await setHotelSearchResults(
              internalSearchId,
              mergedHotels
            );


            console.log(
              `📦 AKBAR REDIS PUBLISH [${reason}] → ${mergedHotels.length} matched hotels`
            );
          }
        ).catch((error) => {

          console.error(
            "❌ AKBAR REDIS PUBLISH ERROR:",
            error
          );
        });


      return publishChain;
    };


    // =========================================================
    // 5. PROCESS CONTENT RESPONSE
    // =========================================================

    const processContentResponse =
      async (
        response,
        reason
      ) => {

        if (!response) {
          return;
        }


        const mappedHotels =
          mapAkbarHotelContentResponse(
            response
          );


        for (
          const hotel of mappedHotels
        ) {

          if (
            !hotel?.supplierHotelId
          ) {
            continue;
          }


          contentMap.set(
            String(
              hotel.supplierHotelId
            ),
            hotel
          );
        }


        console.log(
          `🏨 AKBAR CONTENT ${reason}: ${mappedHotels.length}`
        );


        console.log(
          `📦 AKBAR TOTAL CONTENT LOADED: ${contentMap.size}`
        );


        // Immediately publish any
        // Content + Rate matches.
        await publishMatchedResults(
          `CONTENT-${reason}`
        );
      };


    // =========================================================
    // 6. PROCESS RATE UPDATE
    // =========================================================

    const processRateResponse =
      async (response) => {

        if (!response) {
          return;
        }


        latestRateResponse =
          response;


        const rates =
          mapAkbarHotelRateResponse(
            response
          );


        for (
          const rateHotel of rates
        ) {

          if (
            !rateHotel?.supplierHotelId
          ) {
            continue;
          }


          // A rate-less hotel
          // must not become a result.
          if (!rateHotel?.rate) {
            continue;
          }


          rateMap.set(
            String(
              rateHotel.supplierHotelId
            ),
            rateHotel
          );
        }


        console.log(
          `💰 AKBAR RATE UPDATE → ${rates.length} rates`
        );


        console.log(
          `🔗 CURRENT CONTENT: ${contentMap.size}`
        );


        console.log(
          `🔗 CURRENT RATE MAP: ${rateMap.size}`
        );


        // Immediately publish
        // current Content + Rate matches.
        await publishMatchedResults(
          "RATE-UPDATE"
        );
      };


    // =========================================================
    // 7. CONTENT + RATE START IN PARALLEL
    // =========================================================

    console.log(
      "🚀 STARTING AKBAR CONTENT + RATE IN PARALLEL"
    );


    const content1Promise =
      akbarHotelContentAPI({
        ...searchContext,

        limit: 50,

        offset: -1,

        shouldContinue:
          ensureSearchIsActive,
      });


    const ratePromise =
      akbarHotelRateAPIWithPolling(
        searchContext,
        {
          onUpdate:
            processRateResponse,

          shouldContinue:
            ensureSearchIsActive,
        }
      );


    // =========================================================
    // 8. FIRST CONTENT PAGE
    // =========================================================

    const content1Response =
      await content1Promise;


    if (
      !(await ensureSearchIsActive())
    ) {
      return;
    }


    if (!content1Response) {
      return;
    }


    totalContent =
      content1Response?.total ??
      content1Response?.Count ??
      content1Response?.count ??
      0;


    console.log(
      "📊 AKBAR TOTAL CONTENT:",
      totalContent
    );


    await updateHotelSearchMeta(
      internalSearchId,
      {
        totalContent,

        contentStatus:
          "processing",
      }
    );


    await processContentResponse(
      content1Response,
      "PAGE-1"
    );


    // =========================================================
    // 9. CONTENT PAGINATION
    // =========================================================

    let currentOffset =
      50;

    const CONTENT_PAGE_SIZE =
      2500;


    while (
      totalContent > 0 &&
      contentMap.size < totalContent
    ) {

      // -------------------------------------------------------
      // CHECK SEARCH ACTIVE
      // -------------------------------------------------------

      if (
        !(await ensureSearchIsActive())
      ) {
        return;
      }


      // -------------------------------------------------------
      // CALCULATE REMAINING
      // -------------------------------------------------------

      const remaining =
        totalContent -
        contentMap.size;


      // -------------------------------------------------------
      // CALCULATE CURRENT LIMIT
      // -------------------------------------------------------

      const currentLimit =
        Math.min(
          CONTENT_PAGE_SIZE,
          remaining
        );


      console.log(
        `📄 AKBAR CONTENT NEXT PAGE → offset=${currentOffset}, limit=${currentLimit}`
      );


      // -------------------------------------------------------
      // FETCH NEXT CONTENT PAGE
      // -------------------------------------------------------

      const contentResponse =
        await akbarHotelContentAPI({
          ...searchContext,

          limit:
            currentLimit,

          offset:
            currentOffset,

          shouldContinue:
            ensureSearchIsActive,
        });


      // -------------------------------------------------------
      // CHECK SEARCH ACTIVE
      // -------------------------------------------------------

      if (
        !(await ensureSearchIsActive())
      ) {
        return;
      }


      // -------------------------------------------------------
      // EMPTY RESPONSE
      // -------------------------------------------------------

      if (!contentResponse) {
        console.warn(
          "⚠️ AKBAR CONTENT RESPONSE EMPTY"
        );

        break;
      }


      const hotels =
        contentResponse?.hotels ||
        [];


      // -------------------------------------------------------
      // EMPTY PAGE
      // -------------------------------------------------------

      if (!hotels.length) {

        console.warn(
          `⚠️ AKBAR CONTENT PAGE EMPTY → offset=${currentOffset}. Stopping pagination.`
        );

        break;
      }


      // -------------------------------------------------------
      // PROCESS PAGE
      // -------------------------------------------------------

      await processContentResponse(
        contentResponse,
        `OFFSET-${currentOffset}`
      );


      // -------------------------------------------------------
      // MOVE OFFSET
      // -------------------------------------------------------

      currentOffset +=
        hotels.length;
    }


    // =========================================================
    // 10. CONTENT COMPLETED
    // =========================================================

    await updateHotelSearchMeta(
      internalSearchId,
      {
        contentStatus:
          "completed",

        totalContent:
          contentMap.size,
      }
    );


    console.log(
      "✅ AKBAR CONTENT COMPLETED:",
      contentMap.size
    );


    // =========================================================
    // 11. WAIT ONLY FOR RATE COMPLETION
    // =========================================================
    //
    // Rate polling keeps running independently.
    //
    // We wait here only for the final Rate result.
    //
    // =========================================================

    const rateResponse =
      await ratePromise;


    // =========================================================
    // SEARCH MAY HAVE BEEN CANCELLED
    // =========================================================

    if (
      !(await ensureSearchIsActive())
    ) {
      return;
    }


    // =========================================================
    // RATE STOPPED / CANCELLED
    // =========================================================

    if (!rateResponse) {

      console.log(
        "🛑 AKBAR RATE RETURNED NULL"
      );

      return;
    }


    // =========================================================
    // FINAL RATE SNAPSHOT
    // =========================================================

    await processRateResponse(
      rateResponse
    );


    await publishChain;


    // =========================================================
    // 12. FINAL RESULT
    // =========================================================

    const finalHotels =
      buildMergedHotels();


    console.log(
      "=========================================="
    );

    console.log(
      "✅ AKBAR HOTEL SEARCH COMPLETED"
    );

    console.log(
      "CONTENT:",
      contentMap.size
    );

    console.log(
      "RATES:",
      rateMap.size
    );

    console.log(
      "MATCHED:",
      finalHotels.length
    );

    console.log(
      "=========================================="
    );


    // =========================================================
    // FINAL REDIS SAVE
    // =========================================================

    await setHotelSearchResults(
      internalSearchId,
      finalHotels
    );


    // =========================================================
    // COMPLETE SEARCH
    // =========================================================

    await completeHotelSearch(
      internalSearchId,
      {
        contentStatus:
          "completed",

        rateStatus:
          "completed",

        availableHotels:
          finalHotels.length,
      }
    );


    console.log(
      `⏱️ TOTAL AKBAR SEARCH TIME: ${(performance.now() - totalStart).toFixed(2)} ms`
    );


    // =========================================================
    // RETURN
    // =========================================================

    return {
      supplier:
        "AKBAR",

      searchContext,

      internalSearchId,

      searchSessionId,

      hotels:
        finalHotels,
    };
  },
};