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

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
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
      throw new Error("Internal hotel search ID is required");
    }

    if (!searchSessionId) {
      throw new Error("Hotel search session ID is required");
    }

<<<<<<< HEAD
    // =========================================================
    // SEARCH ACTIVE CHECK
    // =========================================================

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
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

<<<<<<< HEAD

    if (!(await ensureSearchIsActive())) {
      return;
    }


    // =========================================================
    // INIT
=======
    if (!(await ensureSearchIsActive())) return;

    // =========================================================
    // 1. INIT
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    // =========================================================

    const mappingStart = performance.now();
    const initPayload = mapAkbarInitRequest(payload);
    const mappingEnd = performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ${(mappingEnd - mappingStart).toFixed(2)} ms`
    );

<<<<<<< HEAD

    if (!(await ensureSearchIsActive())) {
      return;
    }


    const initResponse =
      await akbarInitAPI(initPayload);
=======
    if (!(await ensureSearchIsActive())) return;

    const initResponse = await akbarInitAPI(initPayload);
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6


    if (!initResponse?.searchId) {
      throw new Error(
        "AKBAR Init failed: searchId not received"
      );
    }

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    const searchContext = {
      searchId: initResponse.searchId,
      searchTracingKey: initResponse.searchTracingKey,
    };

<<<<<<< HEAD

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
=======
    console.log("🔎 AKBAR SEARCH CONTEXT", {
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
      internalSearchId,
      searchSessionId,
      akbarSearchId: searchContext.searchId,
      searchTracingKey: searchContext.searchTracingKey,
    });

    await updateHotelSearchMeta(internalSearchId, {
      akbarSearchId: searchContext.searchId,
      contentStatus: "processing",
      rateStatus: "inprogress",
    });

    // =========================================================
    // 2. LOCAL PROGRESSIVE STATE
    // =========================================================

    const contentMap = new Map();
    const rateMap = new Map();

    let latestRateResponse = null;
    let totalContent = 0;

    // =========================================================
    // 3. MERGE CONTENT + RATE
    // =========================================================

    const buildMergedHotels = () => {
      const contentHotels = Array.from(contentMap.values());

      return contentHotels
        .map((hotel) => {
          const rateHotel = rateMap.get(
            String(hotel.supplierHotelId)
          );

          // Only expose hotels that have a rate.
          if (!rateHotel?.rate) {
            return null;
          }

          return {
            ...hotel,

            rate: rateHotel.rate,

            isRecommended:
              rateHotel.isRecommended ?? null,

            isRefundable:
              rateHotel.isRefundable ?? null,

            moreRatesExpected:
              rateHotel.moreRatesExpected ?? false,

            freeBreakfast:
              rateHotel.freeBreakfast ?? null,

            payAtHotel:
              rateHotel.payAtHotel ?? false,

            freeCancellation:
              rateHotel.freeCancellation ?? false,

            availableSuppliers:
              rateHotel.availableSuppliers ?? [],

            currency:
              latestRateResponse?.currency || "INR",

            rateSupplierData:
              rateHotel,
          };
        })
        .filter(Boolean);
    };

    // =========================================================
    // 4. SERIALIZE REDIS WRITES
    // =========================================================

    let publishChain = Promise.resolve();

    const publishMatchedResults = (reason) => {
      publishChain = publishChain
        .then(async () => {
          if (!(await ensureSearchIsActive())) {
            return;
          }

          const mergedHotels = buildMergedHotels();

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
    // 5. PROCESS CONTENT
    // =========================================================

    const processContentResponse = async (
      response,
      reason
    ) => {
      if (!response) return;

      const mappedHotels =
        mapAkbarHotelContentResponse(response);

      for (const hotel of mappedHotels) {
        contentMap.set(
          String(hotel.supplierHotelId),
          hotel
        );
      }

      console.log(
        `🏨 AKBAR CONTENT ${reason}: ${mappedHotels.length}`
      );

      console.log(
        `📦 AKBAR TOTAL CONTENT LOADED: ${contentMap.size}`
      );

      await publishMatchedResults(
        `CONTENT-${reason}`
      );
    };

    // =========================================================
    // 6. PROCESS RATE UPDATE
    // =========================================================

    const processRateResponse = async (response) => {
      if (!response) return;

      latestRateResponse = response;

      const rates =
        mapAkbarHotelRateResponse(response);

      for (const rateHotel of rates) {
        if (!rateHotel?.supplierHotelId) {
          continue;
        }

        // A rate-less hotel must not become a result.
        if (!rateHotel?.rate) {
          continue;
        }

        rateMap.set(
          String(rateHotel.supplierHotelId),
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

      await publishMatchedResults("RATE-UPDATE");
    };

    // =========================================================
    // 7. CONTENT + RATE START IN PARALLEL
    // =========================================================

    console.log(
      "🚀 STARTING AKBAR CONTENT + RATE IN PARALLEL"
    );

<<<<<<< HEAD

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

=======
    const content1Promise =
      akbarHotelContentAPI({
        ...searchContext,
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
        limit: 50,

        offset: -1,
        shouldContinue: ensureSearchIsActive,
      });

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    const ratePromise =
      akbarHotelRateAPIWithPolling(
        searchContext,
        {
<<<<<<< HEAD
          onUpdate:
            processRateResponse,

          shouldContinue:
            ensureSearchIsActive,
        }
      );


    // =========================================================
    // CONTENT #1
=======
          onUpdate: processRateResponse,
          shouldContinue: ensureSearchIsActive,
        }
      );

    // =========================================================
    // 8. FIRST CONTENT PAGE
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    // =========================================================

    const content1Response =
      await content1Promise;

<<<<<<< HEAD

    if (
      !(await ensureSearchIsActive())
    ) {
      return;
    }


=======
    if (!(await ensureSearchIsActive())) return;

    if (!content1Response) {
      return;
    }

>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    totalContent =
      content1Response?.total ??
      content1Response?.Count ??
      content1Response?.count ??
      0;

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    console.log(
      "📊 AKBAR TOTAL CONTENT:",
      totalContent
    );

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    await updateHotelSearchMeta(
      internalSearchId,
      {
        totalContent,
        contentStatus:
          "processing",
      }
    );

<<<<<<< HEAD

    await processContentResponse(
      content1Response,
      "PAGE-1"
    );


    // =========================================================
    // CONTENT PAGINATION
=======
    await processContentResponse(
      content1Response,
      "PAGE-1"
    );

    // =========================================================
    // 9. CONTENT PAGINATION
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    // =========================================================

    let currentOffset = 50;
    const CONTENT_PAGE_SIZE = 2500;


    while (
      totalContent > 0 &&
<<<<<<< HEAD
      allContentHotels.length <
        totalContent
    ) {

      if (
        !(await ensureSearchIsActive())
      ) {
        return;
      }
=======
      contentMap.size < totalContent
    ) {
      if (!(await ensureSearchIsActive())) return;
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6


      const remaining =
        totalContent - contentMap.size;


<<<<<<< HEAD
      const currentLimit =
        Math.min(
          CONTENT_PAGE_SIZE,
          remaining
        );


      console.log(
        `📄 AKBAR CONTENT NEXT PAGE → offset=${currentOffset}, limit=${currentLimit}`
      );

=======
      console.log(
        `📄 AKBAR CONTENT NEXT PAGE → offset=${currentOffset}, limit=${currentLimit}`
      );
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6

      const contentResponse =
        await akbarHotelContentAPI({
          ...searchContext,
<<<<<<< HEAD

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
=======
          limit: currentLimit,
          offset: currentOffset,
          shouldContinue: ensureSearchIsActive,
        });

      if (!(await ensureSearchIsActive())) return;

      if (!contentResponse) return;
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6


      const hotels =
        contentResponse?.hotels ||
        [];

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
      if (!hotels.length) {

        console.warn(
          `⚠️ AKBAR CONTENT PAGE EMPTY → offset=${currentOffset}. Stopping pagination.`
        );
        break;
      }

<<<<<<< HEAD

=======
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
      await processContentResponse(
        contentResponse,
        `OFFSET-${currentOffset}`
      );

<<<<<<< HEAD

      currentOffset +=
        hotels.length;
    }


    // =========================================================
    // CONTENT COMPLETED
=======
      currentOffset += hotels.length;
    }

    // =========================================================
    // 10. CONTENT COMPLETED
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    // =========================================================

    await updateHotelSearchMeta(
      internalSearchId,
      {
<<<<<<< HEAD
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
=======
        contentStatus: "completed",
        totalContent: contentMap.size,
      }
    );

    console.log(
      "✅ AKBAR CONTENT COMPLETED:",
      contentMap.size
    );

    // =========================================================
    // 11. WAIT ONLY FOR RATE COMPLETION
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    // =========================================================

    const rateResponse = await ratePromise;

<<<<<<< HEAD

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


=======
    if (!(await ensureSearchIsActive())) return;

    if (!rateResponse) {
      return;
    }

    // Make absolutely sure the final rate snapshot is merged.
    await processRateResponse(rateResponse);
    await publishChain;

    // =========================================================
    // 12. FINAL RESULT
    // =========================================================

    const finalHotels = buildMergedHotels();

    console.log("==========================================");
    console.log("✅ AKBAR HOTEL SEARCH COMPLETED");
    console.log("CONTENT:", contentMap.size);
    console.log("RATES:", rateMap.size);
    console.log("MATCHED:", finalHotels.length);
    console.log("==========================================");

>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    await setHotelSearchResults(
      internalSearchId,
      finalHotels
    );

<<<<<<< HEAD

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


=======
    await completeHotelSearch(
      internalSearchId,
      {
        contentStatus: "completed",
        rateStatus: "completed",
        availableHotels: finalHotels.length,
      }
    );

>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    console.log(
      `⏱️ TOTAL AKBAR SEARCH TIME: ${(performance.now() - totalStart).toFixed(2)} ms`
    );

<<<<<<< HEAD

    return {
      supplier:
        "AKBAR",

=======
    return {
      supplier: "AKBAR",
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
      searchContext,
      internalSearchId,
      searchSessionId,
<<<<<<< HEAD

      hotels:
        finalHotels,
=======
      hotels: finalHotels,
>>>>>>> a3cff09dc538146cbe4d5d47b3b6d9a53bb1e7d6
    };
  },
};
