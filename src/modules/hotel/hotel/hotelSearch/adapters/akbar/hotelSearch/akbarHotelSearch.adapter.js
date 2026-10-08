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
      const active = await isHotelSearchActive(
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


    if (!(await ensureSearchIsActive())) {
      return;
    }


    // =========================================================
    // INIT
    // =========================================================

    const mappingStart = performance.now();

    const initPayload =
      mapAkbarInitRequest(payload);

    const mappingEnd = performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(mappingEnd - mappingStart).toFixed(2)} ms`
    );


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


    const searchContext = {
      searchId: initResponse.searchId,
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
    // LOCAL SEARCH STATE
    // =========================================================

    let allContentHotels = [];

    const contentMap = new Map();

    const rateMap = new Map();

    let latestRateResponse = null;

    let totalContent = 0;


    // =========================================================
    // BUILD MERGED RESULTS
    // =========================================================

    const buildMergedHotels = () => {
      const contentHotels = Array.from(
        contentMap.values()
      );

      const mergedHotels =
        contentHotels
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
                latestRateResponse?.currency ||
                "INR",

              rateSupplierData:
                rateHotel,
            };
          })
          .filter(Boolean);

      return mergedHotels;
    };


    // =========================================================
    // REDIS WRITE QUEUE
    // =========================================================
    //
    // Content aur Rate dono parallel update kar sakte hain.
    // Isliye Redis writes ko queue kar rahe hain.
    //

    let publishChain = Promise.resolve();


    const publishMatchedResults = (
      reason = "unknown"
    ) => {
      publishChain =
        publishChain
          .then(async () => {

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
          })
          .catch((error) => {
            console.error(
              "❌ AKBAR REDIS PUBLISH ERROR:",
              error
            );
          });


      return publishChain;
    };


    // =========================================================
    // CONTENT UPDATE
    // =========================================================

    const processContentResponse = async (
      response,
      reason
    ) => {

      const hotels =
        response?.hotels || [];


      for (const hotel of hotels) {

        if (!hotel?.id) {
          continue;
        }

        const hotelId =
          String(hotel.id);

        contentMap.set(
          hotelId,
          hotel
        );
      }


      allContentHotels =
        Array.from(
          contentMap.values()
        );


      console.log(
        `🏨 AKBAR CONTENT ${reason}: ${hotels.length}`
      );

      console.log(
        `📦 AKBAR TOTAL CONTENT LOADED: ${allContentHotels.length}`
      );


      await publishMatchedResults(
        `CONTENT-${reason}`
      );
    };


    // =========================================================
    // RATE UPDATE
    // =========================================================

    const processRateResponse = async (
      response
    ) => {

      if (!response) {
        return;
      }


      latestRateResponse =
        response;


      const rates =
        mapAkbarHotelRateResponse(
          response
        );


      for (const rateHotel of rates) {

        if (
          !rateHotel?.supplierHotelId
        ) {
          continue;
        }


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
        `🔗 CURRENT MATCHED RATES: ${rateMap.size}`
      );


      await publishMatchedResults(
        "RATE-UPDATE"
      );
    };


    // =========================================================
    // CONTENT #1 + RATE START TOGETHER
    // =========================================================

    console.log(
      "🚀 STARTING AKBAR CONTENT + RATE IN PARALLEL"
    );


    const content1Promise =
      akbarHotelContentAPI({
        ...searchContext,

        limit: 50,

        offset: -1,
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
    // CONTENT #1
    // =========================================================

    const content1Response =
      await content1Promise;


    if (
      !(await ensureSearchIsActive())
    ) {
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
    // CONTENT PAGINATION
    // =========================================================

    let currentOffset = 50;

    const CONTENT_PAGE_SIZE = 2500;


    while (
      totalContent > 0 &&
      allContentHotels.length <
        totalContent
    ) {

      if (
        !(await ensureSearchIsActive())
      ) {
        return;
      }


      const remaining =
        totalContent -
        allContentHotels.length;


      const currentLimit =
        Math.min(
          CONTENT_PAGE_SIZE,
          remaining
        );


      console.log(
        `📄 AKBAR CONTENT NEXT PAGE → offset=${currentOffset}, limit=${currentLimit}`
      );


      const contentResponse =
        await akbarHotelContentAPI({
          ...searchContext,

          limit:
            currentLimit,

          offset:
            currentOffset,
        });


      if (
        !(await ensureSearchIsActive())
      ) {
        return;
      }


      const hotels =
        contentResponse?.hotels ||
        [];


      if (!hotels.length) {

        console.warn(
          "⚠️ AKBAR returned 0 hotels. Stopping pagination."
        );

        break;
      }


      await processContentResponse(
        contentResponse,
        `OFFSET-${currentOffset}`
      );


      currentOffset +=
        hotels.length;
    }


    // =========================================================
    // CONTENT COMPLETED
    // =========================================================

    await updateHotelSearchMeta(
      internalSearchId,
      {
        contentStatus:
          "completed",

        totalContent:
          allContentHotels.length,
      }
    );


    console.log(
      "✅ AKBAR CONTENT COMPLETED:",
      allContentHotels.length
    );


    // =========================================================
    // WAIT FOR RATE COMPLETION
    // =========================================================

    const rateResponse =
      await ratePromise;


    if (
      !(await ensureSearchIsActive())
    ) {
      return;
    }


    // Rate cancelled / stopped
    if (!rateResponse) {
      console.log(
        "🛑 AKBAR RATE RETURNED NULL"
      );

      return;
    }


    // =========================================================
    // FINAL RATE UPDATE
    // =========================================================

    await processRateResponse(
      rateResponse
    );


    await publishChain;


    // =========================================================
    // FINAL RESULT
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
      allContentHotels.length
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


    await setHotelSearchResults(
      internalSearchId,
      finalHotels
    );


    await updateHotelSearchMeta(
      internalSearchId,
      {
        rateStatus:
          "completed",

        availableHotels:
          finalHotels.length,
      }
    );


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