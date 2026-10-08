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
  updateHotelSearchMeta,
  setHotelSearchResults,
  completeHotelSearch,
} from "../../../service/hotelSearch.redis.service.js";


export const akbarHotelSearchAdapter = {

  async search(
    payload,
    {
      internalSearchId,
    }
  ) {

    const totalStart =
      performance.now();

    console.log(
      "=============================================="
    );

    console.log(
      "🚀 AKBAR BACKGROUND HOTEL SEARCH START"
    );

    console.log(
      "INTERNAL SEARCH ID:",
      internalSearchId
    );

    console.log(
      "=============================================="
    );


    /**
     * =================================================
     * 1. MAP INIT REQUEST
     * =================================================
     */

    const mappingStart =
      performance.now();

    const initPayload =
      mapAkbarInitRequest(
        payload
      );

    const mappingEnd =
      performance.now();

    console.log(
      `⏱️ INIT REQUEST MAPPING TIME: ` +
        `${(
          mappingEnd -
          mappingStart
        ).toFixed(2)} ms`
    );


    /**
     * =================================================
     * 2. AKBAR INIT
     * =================================================
     */

    const initResponse =
      await akbarInitAPI(
        initPayload
      );

    if (
      !initResponse?.searchId
    ) {
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
      "✅ AKBAR INIT COMPLETED"
    );

    console.log(
      "AKBAR SEARCH ID:",
      searchContext.searchId
    );


    /**
     * =================================================
     * SEARCH STATE
     * =================================================
     */

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


    /**
     * =================================================
     * SHARED SEARCH STATE
     * =================================================
     *
     * Content and Rate run simultaneously.
     *
     * contentMap:
     *     AKBAR hotel ID -> hotel content
     *
     * rateMap:
     *     AKBAR hotel ID -> hotel rate
     *
     */

    const contentMap =
      new Map();

    let rateMap =
      new Map();

    let totalContent =
      0;


    /**
     * =================================================
     * PUBLISH MATCHED RESULTS
     * =================================================
     *
     * Only hotels available in BOTH:
     *
     * Content + Rate
     *
     * will be stored in Redis.
     */

    let publishRunning =
      false;

    let publishQueued =
      false;


    const publishMatchedResults =
      async () => {

        /**
         * Prevent unnecessary
         * simultaneous Redis writes.
         */

        if (publishRunning) {
          publishQueued = true;
          return;
        }

        publishRunning = true;

        try {

          do {

            publishQueued = false;

            const matchedHotels = [];

            /**
             * Preserve Content order.
             */
            for (
              const [
                supplierHotelId,
                hotel,
              ]
                of contentMap
            ) {

              const rate =
                rateMap.get(
                  String(
                    supplierHotelId
                  )
                );

              if (!rate) {
                continue;
              }

              matchedHotels.push({
                ...hotel,

                rate:
                  rate.rate || null,
              });
            }


            /**
             * Save only matched hotels.
             */
            await setHotelSearchResults(
              internalSearchId,
              matchedHotels
            );


            console.log(
              "📦 REDIS MATCHED HOTELS:",
              matchedHotels.length
            );

          } while (
            publishQueued
          );

        } finally {
          publishRunning = false;
        }
      };


    /**
     * =================================================
     * 3. CONTENT SEARCH
     * =================================================
     */

    const contentTask =
      (async () => {

        console.log(
          "📦 AKBAR CONTENT SEARCH START"
        );


        /**
         * ---------------------------------------------
         * CONTENT #1
         * ---------------------------------------------
         *
         * Supplier:
         *
         * limit=50
         * offset=-1
         */

        const content1Start =
          performance.now();

        const contentResponse1 =
          await akbarHotelContentAPI({
            ...searchContext,

            limit: 50,

            offset: -1,
          });

        const content1End =
          performance.now();


        console.log(
          `⏱️ AKBAR CONTENT #1 TIME: ` +
            `${(
              content1End -
              content1Start
            ).toFixed(2)} ms`
        );


        const contentHotels1 =
          contentResponse1?.hotels ||
          [];


        /**
         * Supplier total.
         */
        totalContent =
          Number(
            contentResponse1?.total ??
            contentResponse1?.Count ??
            contentResponse1?.count ??
            0
          );


        console.log(
          "📊 AKBAR CONTENT TOTAL:",
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


        /**
         * Add first page to map.
         */
        addContentHotels(
          contentMap,
          contentHotels1
        );


        console.log(
          "📦 CONTENT #1 STORED:",
          contentMap.size
        );


        /**
         * Publish immediately.
         *
         * Usually Rate may not have
         * arrived yet, but if it has,
         * matching hotels appear.
         */
        await publishMatchedResults();


        /**
         * ---------------------------------------------
         * CONTENT PAGINATION
         * ---------------------------------------------
         */

        let currentOffset =
          50;


        while (
          contentMap.size <
            totalContent
        ) {

          const remaining =
            totalContent -
            contentMap.size;

          if (
            remaining <= 0
          ) {
            break;
          }


          const limit =
            Math.min(
              2500,
              remaining
            );


          console.log(
            "📦 AKBAR CONTENT NEXT PAGE:",
            {
              limit,
              offset:
                currentOffset,
              remaining,
            }
          );


          const pageStart =
            performance.now();


          const response =
            await akbarHotelContentAPI({
              ...searchContext,

              limit,

              offset:
                currentOffset,
            });


          const pageEnd =
            performance.now();


          console.log(
            `⏱️ AKBAR CONTENT PAGE TIME: ` +
              `${(
                pageEnd -
                pageStart
              ).toFixed(2)} ms`
          );


          const pageHotels =
            response?.hotels ||
            [];


          if (
            pageHotels.length === 0
          ) {

            console.log(
              "⚠️ AKBAR CONTENT PAGE EMPTY"
            );

            break;
          }


          const beforeSize =
            contentMap.size;


          addContentHotels(
            contentMap,
            pageHotels
          );


          console.log(
            "📦 CONTENT MAP SIZE:",
            contentMap.size
          );


          /**
           * Protect against supplier
           * returning duplicate pages.
           */
          if (
            contentMap.size ===
            beforeSize
          ) {

            console.log(
              "⚠️ CONTENT PAGE ADDED NO NEW HOTELS"
            );

            break;
          }


          /**
           * Publish matches after
           * every content page.
           */
          await publishMatchedResults();


          currentOffset +=
            pageHotels.length;
        }


        /**
         * Content completed.
         */

        await updateHotelSearchMeta(
          internalSearchId,
          {
            totalContent:
              contentMap.size,

            contentStatus:
              "completed",
          }
        );


        console.log(
          "✅ AKBAR CONTENT COMPLETED:",
          contentMap.size
        );

      })();


    /**
     * =================================================
     * 4. RATE POLLING
     * =================================================
     *
     * This starts at the same time
     * as Content.
     */

    const rateTask =
      (async () => {

        console.log(
          "💰 AKBAR RATE POLLING START"
        );


        const finalRateResponse =
          await akbarHotelRateAPIWithPolling({

            ...searchContext,

            /**
             * Every Rate response
             * comes here.
             */
            onUpdate:
              async (
                rateResponse
              ) => {

                const mappedRates =
                  mapAkbarHotelRateResponse(
                    rateResponse
                  );


                /**
                 * Replace current snapshot.
                 *
                 * AKBAR response is
                 * progressively growing:
                 *
                 * 50
                 * 950
                 * 954
                 * ...
                 */

                rateMap =
                  new Map(
                    mappedRates.map(
                      (hotel) => [
                        String(
                          hotel.supplierHotelId
                        ),

                        hotel,
                      ]
                    )
                  );


                console.log(
                  "💰 RATE MAP SIZE:",
                  rateMap.size
                );


                /**
                 * Update metadata.
                 */
                await updateHotelSearchMeta(
                  internalSearchId,
                  {
                    rateStatus:
                      String(
                        rateResponse?.searchStatus ||
                          ""
                      ).toLowerCase() ===
                      "completed"
                        ? "completed"
                        : "inprogress",
                  }
                );


                /**
                 * Match current Rate
                 * snapshot with whatever
                 * Content is available.
                 */
                await publishMatchedResults();

              },
          });


        /**
         * Final rate response completed.
         */

        const finalRates =
          mapAkbarHotelRateResponse(
            finalRateResponse
          );


        rateMap =
          new Map(
            finalRates.map(
              (hotel) => [
                String(
                  hotel.supplierHotelId
                ),

                hotel,
              ]
            )
          );


        await updateHotelSearchMeta(
          internalSearchId,
          {
            rateStatus:
              "completed",
          }
        );


        /**
         * Final merge after Rate
         * completion.
         */
        await publishMatchedResults();


        console.log(
          "✅ AKBAR RATE COMPLETED:",
          rateMap.size
        );

      })();


    /**
     * =================================================
     * 5. WAIT FOR BOTH BACKGROUND TASKS
     * =================================================
     */

    try {

      await Promise.all([
        contentTask,
        rateTask,
      ]);

    } catch (error) {

      console.error(
        "❌ AKBAR CONTENT/RATE BACKGROUND ERROR:",
        error
      );

      throw error;
    }


    /**
     * =================================================
     * 6. FINAL REDIS STATE
     * =================================================
     */

    const finalResults =
      await getCurrentResultsSafely(
        internalSearchId
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


    const totalEnd =
      performance.now();


    console.log(
      "=============================================="
    );

    console.log(
      "✅ AKBAR BACKGROUND SEARCH COMPLETED"
    );

    console.log(
      "CONTENT HOTELS:",
      contentMap.size
    );

    console.log(
      "RATE HOTELS:",
      rateMap.size
    );

    console.log(
      "MATCHED HOTELS:",
      finalResults.length
    );

    console.log(
      `⏱️ TOTAL AKBAR SEARCH TIME: ` +
        `${(
          totalEnd -
          totalStart
        ).toFixed(2)} ms`
    );

    console.log(
      "=============================================="
    );


    return {
      supplier: "AKBAR",

      searchId:
        internalSearchId,

      status:
        "completed",

      availableHotels:
        finalResults.length,
    };
  },
};


/**
 * =====================================================
 * HELPER: ADD CONTENT HOTELS
 * =====================================================
 */

const addContentHotels = (
  contentMap,
  hotels
) => {

  for (
    const hotel of hotels
  ) {

    const supplierHotelId =
      hotel?.id;

    if (
      supplierHotelId ===
        undefined ||
      supplierHotelId ===
        null
    ) {
      continue;
    }


    const key =
      String(
        supplierHotelId
      );


    /**
     * Do not overwrite an
     * already stored hotel.
     */
    if (
      !contentMap.has(key)
    ) {

      contentMap.set(
        key,
        hotel
      );
    }
  }
};


/**
 * =====================================================
 * SAFE REDIS RESULT READER
 * =====================================================
 */

const getCurrentResultsSafely =
  async (searchId) => {

    /**
     * Lazy import avoids creating
     * another top-level dependency.
     */

    const {
      getHotelSearchResults,
    } =
      await import(
        "../../service/hotelSearch.redis.service.js"
      );


    return (
      await getHotelSearchResults(
        searchId
      )
    ) || [];
  };