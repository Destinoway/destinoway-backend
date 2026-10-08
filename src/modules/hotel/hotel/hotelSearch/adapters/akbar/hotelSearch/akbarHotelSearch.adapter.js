import {
  akbarInitAPI,
} from "./api/akbarInit.api.js";

import {
  akbarHotelContentAPI,
} from "./api/akbarHotelContent.api.js";

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
} from "../../../../hotelSearch/service/hotelSearch.redis.service.js";


const CONTENT_PAGE_SIZE = 2500;


/**
 * Main AKBAR background search.
 */
export const akbarHotelSearchAdapter = {

  async search(
    payload,
    {
      internalSearchId,
    } = {}
  ) {

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "🚀 AKBAR BACKGROUND SEARCH STARTED"
    );

    console.log(
      "Internal Search ID:",
      internalSearchId
    );

    console.log(
      "=========================================="
    );


    // =====================================================
    // 1. CHECK SEARCH
    // =====================================================

    const isActive =
      await isHotelSearchActive(
        internalSearchId
      );

    if (!isActive) {
      console.log(
        "🛑 SEARCH NO LONGER ACTIVE"
      );

      return;
    }


    // =====================================================
    // 2. INIT
    // =====================================================

    const initPayload =
      mapAkbarInitRequest(
        payload
      );

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
      "🔎 AKBAR SUPPLIER SEARCH ID:",
      searchContext.searchId
    );


    // =====================================================
    // 3. INTERNAL MAPS
    // =====================================================

    const contentMap =
      new Map();

    const rateMap =
      new Map();


    let contentTotal = 0;

    let contentReceived = 0;


    // =====================================================
    // 4. PUBLISH MATCHED RESULTS
    // =====================================================

    let publishing = false;
    let publishQueued = false;


    const publishMatchedResults =
      async () => {

        if (publishing) {
          publishQueued = true;
          return;
        }

        publishing = true;

        try {

          do {

            publishQueued = false;

            const matchedHotels = [];

            for (
              const [hotelId, contentHotel]
              of contentMap
            ) {

              const rateHotel =
                rateMap.get(
                  String(hotelId)
                );

              if (!rateHotel) {
                continue;
              }

              if (!rateHotel.rate) {
                continue;
              }

              matchedHotels.push({
                ...contentHotel,

                rate:
                  rateHotel.rate,

                isRecommended:
                  rateHotel.isRecommended,

                moreRatesExpected:
                  rateHotel.moreRatesExpected,

                isRefundable:
                  rateHotel.isRefundable,

                freeBreakfast:
                  rateHotel.freeBreakfast,

                payAtHotel:
                  rateHotel.payAtHotel,

                freeCancellation:
                  rateHotel.freeCancellation,

                rateSupplierData:
                  rateHotel.rawSupplierData,
              });
            }


            const saved =
              await setHotelSearchResults(
                internalSearchId,
                matchedHotels
              );


            if (!saved) {
              return;
            }


            console.log(
              `📦 REDIS MATCHED HOTELS: ${matchedHotels.length}`
            );


          } while (publishQueued);

        } finally {
          publishing = false;
        }
      };


    // =====================================================
    // 5. RATE BACKGROUND TASK
    // =====================================================

    const rateTask =
      akbarHotelRateAPIWithPolling({

        ...searchContext,

        shouldContinue:
          async () =>
            isHotelSearchActive(
              internalSearchId
            ),

        onUpdate:
          async (rateResponse) => {

            if (
              !await isHotelSearchActive(
                internalSearchId
              )
            ) {
              return;
            }


            const mappedRates =
              mapAkbarHotelRateResponse(
                rateResponse
              );


            rateMap.clear();


            for (
              const rateHotel
              of mappedRates
            ) {

              rateMap.set(
                String(
                  rateHotel.supplierHotelId
                ),
                rateHotel
              );
            }


            await updateHotelSearchMeta(
              internalSearchId,
              {
                rateStatus:
                  String(
                    rateResponse?.searchStatus ||
                    "inprogress"
                  ).toLowerCase(),

                rateHotelCount:
                  mappedRates.length,
              }
            );


            await publishMatchedResults();
          },
      });


    // =====================================================
    // 6. CONTENT BACKGROUND TASK
    // =====================================================

    const contentTask =
      (async () => {

        // -----------------------------------------------
        // CONTENT #1
        // -----------------------------------------------

        const content1Response =
          await akbarHotelContentAPI({

            ...searchContext,

            limit: 50,

            offset: -1,
          });


        if (
          !await isHotelSearchActive(
            internalSearchId
          )
        ) {
          return;
        }


        const firstHotels =
          content1Response?.hotels ||
          [];


        contentTotal =
          Number(
            content1Response?.total ||
            0
          );


        contentReceived =
          firstHotels.length;


        console.log(
          "📄 AKBAR CONTENT #1:",
          firstHotels.length
        );

        console.log(
          "📦 AKBAR CONTENT TOTAL:",
          contentTotal
        );


        // -----------------------------------------------
        // SAVE CONTENT #1
        // -----------------------------------------------

        const mappedContent =
          mapAkbarHotelContentResponse({
            hotels:
              firstHotels,
          });


        for (
          const hotel
          of mappedContent
        ) {

          contentMap.set(
            String(
              hotel.supplierHotelId
            ),
            hotel
          );
        }


        await updateHotelSearchMeta(
          internalSearchId,
          {
            totalContent:
              contentTotal,

            contentReceived,
          }
        );


        await publishMatchedResults();


        // -----------------------------------------------
        // CONTENT PAGINATION
        // -----------------------------------------------

        let currentOffset = 50;


        while (
          contentTotal > 0 &&
          contentReceived < contentTotal
        ) {

          if (
            !await isHotelSearchActive(
              internalSearchId
            )
          ) {
            console.log(
              "🛑 CONTENT SEARCH CANCELLED"
            );

            return;
          }


          const remaining =
            contentTotal -
            contentReceived;


          const currentLimit =
            Math.min(
              CONTENT_PAGE_SIZE,
              remaining
            );


          console.log("");
          console.log(
            "=========================================="
          );

          console.log(
            "📄 AKBAR CONTENT NEXT PAGE"
          );

          console.log(
            "Offset:",
            currentOffset
          );

          console.log(
            "Limit:",
            currentLimit
          );

          console.log(
            "Remaining:",
            remaining
          );

          console.log(
            "=========================================="
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
            !await isHotelSearchActive(
              internalSearchId
            )
          ) {
            return;
          }


          const hotels =
            contentResponse?.hotels ||
            [];


          if (!hotels.length) {

            console.warn(
              "⚠️ AKBAR CONTENT RETURNED 0 HOTELS. STOPPING."
            );

            break;
          }


          const mappedHotels =
            mapAkbarHotelContentResponse({
              hotels,
            });


          for (
            const hotel
            of mappedHotels
          ) {

            contentMap.set(
              String(
                hotel.supplierHotelId
              ),
              hotel
            );
          }


          contentReceived +=
            hotels.length;


          currentOffset +=
            hotels.length;


          await updateHotelSearchMeta(
            internalSearchId,
            {
              totalContent:
                contentTotal,

              contentReceived,
            }
          );


          // Publish any hotels whose rates
          // are already available.
          await publishMatchedResults();


          console.log(
            "📦 TOTAL CONTENT RECEIVED:",
            contentReceived
          );
        }


        await updateHotelSearchMeta(
          internalSearchId,
          {
            contentStatus:
              "completed",

            totalContent:
              contentTotal,

            contentReceived,
          }
        );


        console.log(
          "✅ AKBAR CONTENT COMPLETED"
        );

      })();


    // =====================================================
    // 7. WAIT FOR BOTH BACKGROUND TASKS
    // =====================================================

    const [
      contentResult,
      rateResult,
    ] = await Promise.allSettled([
      contentTask,
      rateTask,
    ]);


    // =====================================================
    // 8. HANDLE ERRORS
    // =====================================================

    if (
      contentResult.status ===
      "rejected"
    ) {

      console.error(
        "❌ AKBAR CONTENT TASK FAILED:",
        contentResult.reason
      );

      throw contentResult.reason;
    }


    if (
      rateResult.status ===
      "rejected"
    ) {

      console.error(
        "❌ AKBAR RATE TASK FAILED:",
        rateResult.reason
      );

      throw rateResult.reason;
    }


    // =====================================================
    // 9. FINAL COMPLETE
    // =====================================================

    if (
      await isHotelSearchActive(
        internalSearchId
      )
    ) {

      const finalResults =
        [];

      for (
        const [hotelId, contentHotel]
        of contentMap
      ) {

        const rateHotel =
          rateMap.get(
            String(hotelId)
          );

        if (
          !rateHotel?.rate
        ) {
          continue;
        }

        finalResults.push({
          ...contentHotel,

          rate:
            rateHotel.rate,

          isRecommended:
            rateHotel.isRecommended,

          moreRatesExpected:
            rateHotel.moreRatesExpected,

          isRefundable:
            rateHotel.isRefundable,

          freeBreakfast:
            rateHotel.freeBreakfast,

          payAtHotel:
            rateHotel.payAtHotel,

          freeCancellation:
            rateHotel.freeCancellation,

          rateSupplierData:
            rateHotel.rawSupplierData,
        });
      }


      await setHotelSearchResults(
        internalSearchId,
        finalResults
      );


      await completeHotelSearch(
        internalSearchId,
        {
          contentStatus:
            "completed",

          rateStatus:
            "completed",

          availableHotels:
            finalResults.length,
        }
      );


      console.log("");
      console.log(
        "=========================================="
      );

      console.log(
        "✅ AKBAR BACKGROUND SEARCH COMPLETED"
      );

      console.log(
        "AVAILABLE HOTELS:",
        finalResults.length
      );

      console.log(
        "=========================================="
      );
    }

  },
};