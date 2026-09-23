

import HotelSearch from "./hotelSearch.model.js";
import mongoose from "mongoose";

import {
  searchHotelAPI,
  searchMoreHotelsAPI,
} from "./adapters/flyshop/hotelSearch.api.js";

import {
  mapHotelSearchRequest,
} from "./adapters/flyshop/hotelSearch.request.mapper.js";

import {
  mapHotelSearchResponse,
} from "./adapters/flyshop/hotelSearch.response.mapper.js";

import {
  findHotelSearchCache,
  saveHotelSearch,
  appendHotelSearchHotels,
} from "./hotelSearch.repository.js";

import { queryBuilder } from "../../../utils/queryBuilder.js";


// ============================================================
// RUNNING MORE HOTEL SEARCHES
// ============================================================

const runningMoreHotelSearches = new Set();


// ============================================================
// MAP SUPPLIER HOTEL
// ============================================================

const mapSupplierHotel = (hotel) => ({
  hotelId:
    hotel?.HotelId ||
    null,

  hotelKey:
    hotel?.HotelKey ||
    null,

  name:
    hotel?.HotelName ||
    null,

  description:
    hotel?.HotelDesc ||
    null,

  location: {
    address:
      hotel?.Address ||
      null,

    city:
      hotel?.City ||
      null,

    state:
      hotel?.state ||
      null,

    country:
      hotel?.Country ||
      null,

    pincode:
      hotel?.Pincode ||
      null,

    latitude:
      hotel?.Latitude !== undefined &&
      hotel?.Latitude !== null &&
      hotel?.Latitude !== ""
        ? Number(hotel.Latitude)
        : null,

    longitude:
      hotel?.Longitude !== undefined &&
      hotel?.Longitude !== null &&
      hotel?.Longitude !== ""
        ? Number(hotel.Longitude)
        : null,
  },

  contact: {
    phone:
      hotel?.HotelPhone ||
      null,

    email:
      hotel?.HotelEmail ||
      null,
  },

  starCategory:
    hotel?.StarCategoryId !== undefined &&
    hotel?.StarCategoryId !== null &&
    hotel?.StarCategoryId !== ""
      ? Number(hotel.StarCategoryId)
      : null,

  image:
    hotel?.HotelImage ||
    null,

  facilities: (
    Array.isArray(
      hotel?.HotelFacilities
    )
      ? hotel.HotelFacilities
      : []
  ).map((facility) => ({
    id:
      facility?.FacilityId ||
      null,

    name:
      facility?.FacilityName?.trim() ||
      null,
  })),

  pricing: {
    currency:
      hotel?.Currencycode ||
      null,

    basicAmount:
      Number(
        hotel?.LowestBasicAmount || 0
      ),

    tax:
      Number(
        hotel?.LowestRateTax || 0
      ),

    totalAmount:
      Number(
        hotel?.TotalAmount || 0
      ),

    serviceFee:
      Number(
        hotel?.ServiceFeeAmount || 0
      ),

    markup:
      Number(
        hotel?.TradeMarkupAmount || 0
      ),

    gst:
      Number(
        hotel?.GST || 0
      ),
  },

  checkIn: {
    date:
      hotel?.CheckInDate ||
      null,

    time:
      hotel?.CheckInTime ||
      null,
  },

  checkOut: {
    date:
      hotel?.CheckOutDate ||
      null,

    time:
      hotel?.CheckOutTime ||
      null,
  },

  policy: {
    applicableCode:
      hotel?.ApplicablePolicyCode ||
      null,

    state:
      hotel?.PolicyState ||
      null,

    outPolicyReason:
      hotel?.OutPolicyReason ||
      null,
  },

  supplier: "flyshop",
});


// ============================================================
// MAP SUPPLIER HOTELS
// ============================================================

const mapSupplierHotels = (
  hotels = []
) => {
  if (!Array.isArray(hotels)) {
    return [];
  }

  return hotels.map(
    mapSupplierHotel
  );
};


// ============================================================
// GET HOTELS WITH SEARCH / FILTER / SORT / PAGINATION
// ============================================================

const getHotelSearchResult = async ({
  cacheKey,
  payload,
}) => {

  console.log(
    "=========================================="
  );

  console.log(
    "GET HOTEL SEARCH RESULT"
  );

  console.log(
    "Cache Key:",
    cacheKey
  );

  console.log(
    "=========================================="
  );

  const result = await queryBuilder({
    model: HotelSearch,

    query: {
      ...payload,
      cacheKey,
    },

    // --------------------------------------------------------
    // ROOT DOCUMENT FILTER
    // --------------------------------------------------------

    filterFields: [
      "cacheKey",
    ],

    // --------------------------------------------------------
    // HOTEL ARRAY
    // --------------------------------------------------------

    arrayField:
      "hotels",

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    searchFields: [
      "name",
      "location.city",
      "location.address",
      "location.state",
      "location.pincode",
    ],

    // --------------------------------------------------------
    // FILTER
    // --------------------------------------------------------

    arrayFilterFields: [
      "starCategory",
      "location.city",
    ],

    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    sortFields: [
      "name",
      "location.city",
      "starCategory",
      "pricing.totalAmount",
      "pricing.basicAmount",
      "pricing.tax",
    ],

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    defaultPage: 1,

    defaultLimit: 10,

    maxLimit: 100,
  });

  console.log(
    "QueryBuilder Result Count:",
    result?.data?.length || 0
  );

  console.log(
    "QueryBuilder Meta:",
    result?.meta
  );

  return result;
};


// ============================================================
// BACKGROUND MORE HOTEL SEARCH
// ============================================================

const fetchAndSaveMoreHotels = async ({
  searchId,
  searchKey,
}) => {

  // ----------------------------------------------------------
  // PREVENT DUPLICATE BACKGROUND SEARCH
  // ----------------------------------------------------------

  if (
    runningMoreHotelSearches.has(
      searchId
    )
  ) {

    console.log(
      "HotelSearchMore already running:",
      searchId
    );

    return;
  }

  runningMoreHotelSearches.add(
    searchId
  );

  try {

    console.log(
      "=========================================="
    );

    console.log(
      "BACKGROUND HOTEL SEARCH MORE STARTED"
    );

    console.log(
      "SearchID:",
      searchId
    );

    console.log(
      "SearchKey:",
      searchKey
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // CALL SUPPLIER
    // ========================================================

    const moreResponse =
      await searchMoreHotelsAPI({
        searchId,
        searchKey,
      });


    // ========================================================
    // DEBUG SUPPLIER MORE RESPONSE
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "HOTEL SEARCH MORE SUPPLIER RESPONSE"
    );

    console.log(
      "SearchID:",
      moreResponse?.SearchID
    );

    console.log(
      "SearchKey:",
      moreResponse?.SearchKey
    );

    console.log(
      "MoreHotels:",
      moreResponse?.MoreHotels
    );

    console.log(
      "HotelDetails is Array:",
      Array.isArray(
        moreResponse?.HotelDetails
      )
    );

    console.log(
      "HotelDetails Count:",
      moreResponse?.HotelDetails?.length
    );

    console.log(
      "Response Keys:",
      Object.keys(
        moreResponse || {}
      )
    );

    console.log(
      "First Hotel:",
      moreResponse?.HotelDetails?.[0]
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // MAP RESPONSE
    // ========================================================

    const moreHotels =
      mapSupplierHotels(
        moreResponse?.HotelDetails || []
      );


    // ========================================================
    // DEBUG MAPPED MORE HOTELS
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "MAPPED MORE HOTELS"
    );

    console.log(
      "Count:",
      moreHotels.length
    );

    console.log(
      "First mapped hotel:",
      moreHotels?.[0]
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // SAVE MORE HOTELS
    // ========================================================

    if (
      moreHotels.length > 0
    ) {

      console.log(
        "Appending more hotels to MongoDB..."
      );

      await appendHotelSearchHotels({
        searchId,

        hotels:
          moreHotels,

        moreHotels:
          moreResponse?.MoreHotels ??
          false,
      });

      console.log(
        "More hotels appended successfully."
      );

    } else {

      console.log(
        "No more hotels received."
      );

      await HotelSearch.updateOne(
        {
          searchId,
        },
        {
          $set: {
            moreHotels:
              moreResponse?.MoreHotels ??
              false,
          },
        }
      );
    }


    console.log(
      "=========================================="
    );

    console.log(
      `${moreHotels.length} more hotels saved for ${searchId}`
    );

    console.log(
      "HotelSearchMore completed:",
      searchId
    );

    console.log(
      "=========================================="
    );

  } catch (error) {

    console.error(
      "=========================================="
    );

    console.error(
      "BACKGROUND HOTEL SEARCH MORE FAILED"
    );

    console.error(
      "SearchID:",
      searchId
    );

    console.error(
      "Error:",
      error?.message || error
    );

    console.error(
      "Stack:",
      error?.stack
    );

    console.error(
      "=========================================="
    );

  } finally {

    runningMoreHotelSearches.delete(
      searchId
    );
  }
};


// ============================================================
// MAIN HOTEL SEARCH SERVICE
// ============================================================

export const searchHotelService = async (
  payload
) => {

  try {

    // ========================================================
    // 1. MAP REQUEST
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "HOTEL SEARCH REQUEST"
    );

    console.log(
      "Payload:",
      payload
    );

    console.log(
      "=========================================="
    );


    const supplierPayload =
      mapHotelSearchRequest(
        payload
      );


    console.log(
      "=========================================="
    );

    console.log(
      "SUPPLIER PAYLOAD"
    );

    console.log(
      supplierPayload
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // 2. CREATE CACHE KEY
    // ========================================================

    const cacheKey =
      JSON.stringify({
        supplier: "flyshop",

        destination:
          supplierPayload.Origin,

        checkIn:
          payload.checkIn,

        checkOut:
          payload.checkOut,

        rooms:
          payload.rooms,
      });


    console.log(
      "Hotel Cache Key:",
      cacheKey
    );


    // ========================================================
    // 3. CHECK CACHE
    // ========================================================

    const cachedSearch =
      await findHotelSearchCache({
        cacheKey,
      });


    // ========================================================
    // 4. CACHE HIT
    // ========================================================

    if (cachedSearch) {

      console.log(
        "=========================================="
      );

      console.log(
        "HOTEL SEARCH CACHE HIT"
      );

      console.log(
        "Mongo ID:",
        cachedSearch?._id
      );

      console.log(
        "HotelDetailId:",
        cachedSearch?.hotelDetailId
      );

      console.log(
        "SearchID:",
        cachedSearch?.searchId
      );

      console.log(
        "SearchKey:",
        cachedSearch?.searchKey
      );

      console.log(
        "Hotels stored:",
        cachedSearch?.hotels?.length
      );

      console.log(
        "MoreHotels:",
        cachedSearch?.moreHotels
      );

      console.log(
        "=========================================="
      );


      // ------------------------------------------------------
      // BACKGROUND MORE HOTEL SEARCH
      // ------------------------------------------------------

      if (
        cachedSearch.moreHotels === true
      ) {

        console.log(
          "Starting background HotelSearchMore..."
        );

        fetchAndSaveMoreHotels({
          searchId:
            cachedSearch.searchId,

          searchKey:
            cachedSearch.searchKey,
        }).catch((error) => {

          console.error(
            "Unhandled HotelSearchMore error:",
            error?.message || error
          );

        });
      }


      // ------------------------------------------------------
      // SEARCH / FILTER / SORT / PAGINATION
      // ------------------------------------------------------

      const result =
        await getHotelSearchResult({
          cacheKey,
          payload,
        });


      console.log(
        "CACHE QUERY RESULT:",
        result?.data?.length || 0
      );


      // ------------------------------------------------------
      // MAP RESPONSE
      // ------------------------------------------------------

      const mappedResult =
        mapHotelSearchResponse({
          hotels:
            result.data,

          hotelDetailId:
            cachedSearch.hotelDetailId,
        });


      console.log(
        "=========================================="
      );

      console.log(
        "MAPPED CACHE RESPONSE"
      );

      console.log(
        "HotelDetailId:",
        mappedResult?.hotelDetailId
      );

      console.log(
        "Hotels:",
        mappedResult?.hotels?.length || 0
      );

      console.log(
        "=========================================="
      );


      // ------------------------------------------------------
      // RETURN
      // ------------------------------------------------------

      return {

        ...mappedResult,

        meta:
          result.meta,

        moreHotels:
          cachedSearch.moreHotels,

        fromCache:
          true,
      };
    }


    // ========================================================
    // 5. CACHE MISS
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "HOTEL SEARCH CACHE MISS"
    );

    console.log(
      "Calling Flyshop supplier..."
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // 6. CALL SUPPLIER
    // ========================================================

    const supplierResponse =
      await searchHotelAPI(
        supplierPayload
      );


    // ========================================================
    // DEBUG SUPPLIER RESPONSE
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "SUPPLIER RESPONSE DEBUG"
    );

    console.log(
      "SearchID:",
      supplierResponse?.SearchID
    );

    console.log(
      "SearchKey:",
      supplierResponse?.SearchKey
    );

    console.log(
      "MoreHotels:",
      supplierResponse?.MoreHotels
    );

    console.log(
      "HotelDetails is Array:",
      Array.isArray(
        supplierResponse?.HotelDetails
      )
    );

    console.log(
      "HotelDetails Count:",
      supplierResponse?.HotelDetails?.length
    );

    console.log(
      "Response Header:",
      supplierResponse?.Response_Header
    );

    console.log(
      "Response Keys:",
      Object.keys(
        supplierResponse || {}
      )
    );

    console.log(
      "First Hotel:",
      supplierResponse?.HotelDetails?.[0]
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // 7. MAP HOTELS
    // ========================================================

    const hotels =
      mapSupplierHotels(
        supplierResponse?.HotelDetails || []
      );


    // ========================================================
    // DEBUG MAPPED HOTELS
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "MAPPED HOTELS DEBUG"
    );

    console.log(
      "Mapped hotels count:",
      hotels.length
    );

    console.log(
      "First mapped hotel:",
      hotels?.[0]
    );

    console.log(
      "First hotelId:",
      hotels?.[0]?.hotelId
    );

    console.log(
      "First hotelKey:",
      hotels?.[0]?.hotelKey
    );

    console.log(
      "First hotel name:",
      hotels?.[0]?.name
    );

    console.log(
      "First hotel location:",
      hotels?.[0]?.location
    );

    console.log(
      "=========================================="
    );


    console.log(
      "Initial hotels received:",
      hotels.length
    );


    // ========================================================
    // GENERATE ROOT HOTEL DETAIL ID
    // ========================================================

    const hotelDetailId =
      new mongoose.Types.ObjectId().toString();


    console.log(
      "Generated hotelDetailId:",
      hotelDetailId
    );


    // ========================================================
    // 8. SAVE COMPLETE HOTEL SEARCH
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "SAVING HOTEL SEARCH TO MONGODB"
    );

    console.log(
      "=========================================="
    );


    const savePayload = {

      hotelDetailId,

      cacheKey,

      searchId:
        supplierResponse?.SearchID,

      searchKey:
        supplierResponse?.SearchKey,

      supplier:
        "flyshop",

      destination:
        supplierPayload.Origin,

      checkIn:
        new Date(
          payload.checkIn
        ),

      checkOut:
        new Date(
          payload.checkOut
        ),

      rooms:
        payload.rooms,

      hotels,

      totalHotels:
        hotels.length,

      moreHotels:
        supplierResponse?.MoreHotels ||
        false,

      responseStatus:
        supplierResponse
          ?.Response_Header
          ?.ErrorCode,

      expiresAt:
        new Date(
          Date.now() +
          30 * 60 * 1000
        ),
    };


    // --------------------------------------------------------
    // DEBUG SAVE PAYLOAD
    // --------------------------------------------------------

    console.log(
      "SAVE PAYLOAD:"
    );

    console.log({
      hotelDetailId:
        savePayload.hotelDetailId,

      cacheKey:
        savePayload.cacheKey,

      searchId:
        savePayload.searchId,

      searchKey:
        savePayload.searchKey,

      supplier:
        savePayload.supplier,

      destination:
        savePayload.destination,

      checkIn:
        savePayload.checkIn,

      checkOut:
        savePayload.checkOut,

      hotelsCount:
        savePayload.hotels.length,

      totalHotels:
        savePayload.totalHotels,

      moreHotels:
        savePayload.moreHotels,

      responseStatus:
        savePayload.responseStatus,

      expiresAt:
        savePayload.expiresAt,
    });


    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const savedSearch =
      await saveHotelSearch(
        savePayload
      );


    // ========================================================
    // DEBUG SAVED DOCUMENT
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "HOTEL SEARCH SAVED SUCCESSFULLY"
    );

    console.log(
      "Mongo _id:",
      savedSearch?._id
    );

    console.log(
      "HotelDetailId:",
      savedSearch?.hotelDetailId
    );

    console.log(
      "SearchID:",
      savedSearch?.searchId
    );

    console.log(
      "SearchKey:",
      savedSearch?.searchKey
    );

    console.log(
      "Hotels saved:",
      savedSearch?.hotels?.length
    );

    console.log(
      "TotalHotels:",
      savedSearch?.totalHotels
    );

    console.log(
      "MoreHotels:",
      savedSearch?.moreHotels
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // 9. START BACKGROUND MORE SEARCH
    // ========================================================

    if (
      savedSearch.moreHotels === true
    ) {

      console.log(
        "Starting background HotelSearchMore..."
      );

      fetchAndSaveMoreHotels({
        searchId:
          savedSearch.searchId,

        searchKey:
          savedSearch.searchKey,
      }).catch((error) => {

        console.error(
          "Unhandled HotelSearchMore error:",
          error?.message || error
        );

      });
    }


    // ========================================================
    // 10. SEARCH / FILTER / SORT / PAGINATION
    // ========================================================

    const result =
      await getHotelSearchResult({
        cacheKey,
        payload,
      });


    console.log(
      "SAVED QUERY RESULT:",
      result?.data?.length || 0
    );


    // ========================================================
    // 11. MAP RESPONSE
    // ========================================================

    const mappedResult =
      mapHotelSearchResponse({
        hotels:
          result.data,

        hotelDetailId:
          savedSearch.hotelDetailId,
      });


    console.log(
      "=========================================="
    );

    console.log(
      "FINAL MAPPED RESPONSE"
    );

    console.log(
      "HotelDetailId:",
      mappedResult?.hotelDetailId
    );

    console.log(
      "Hotels:",
      mappedResult?.hotels?.length || 0
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // 12. FINAL RESPONSE
    // ========================================================

    return {

      ...mappedResult,

      meta:
        result.meta,

      moreHotels:
        savedSearch.moreHotels,

      fromCache:
        false,
    };

  } catch (error) {

    // ========================================================
    // MAIN ERROR
    // ========================================================

    console.error(
      "=========================================="
    );

    console.error(
      "HOTEL SEARCH ERROR"
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Name:",
      error?.name
    );

    console.error(
      "Stack:",
      error?.stack
    );

    console.error(
      "=========================================="
    );

    throw error;
  }
};

