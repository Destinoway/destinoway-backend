import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";
import {
  cacheHotelRoomProviders,
  getCachedHotelRoomProvider,
} from "../../utils/hotelRoomProviderCache.js";
import { akbarHotelPriceVerifyAPI } from "../adapters/akbar/api/hotelPriceVerify.api.js";
import { mapAkbarHotelPriceVerifyResponse } from "../adapters/akbar/mappers/hotelPriceVerify.mapper.js";
import { hotelRoomsAPI } from "../../hotelDetail/adapters/akbar/api/hotelRooms.api.js";

const supplierPriceVerifyAdapters = {
  AKBAR: {
    verifyPrice: akbarHotelPriceVerifyAPI,
    mapResponse: mapAkbarHotelPriceVerifyResponse,
  },
};

export const verifyHotelPrice = async ({
  searchId,
  hotelId,
  recommendationId,
}) => {
  if (!hotelId) {
    const error = new Error("Hotel ID is required");
    error.statusCode = 400;
    throw error;
  }

  const search = await resolveSupplierSearch(searchId);
  let providerName = await getCachedHotelRoomProvider({
    searchId,
    hotelId,
    recommendationId,
  });

  if (!providerName) {
    const rooms = await hotelRoomsAPI({
      supplierSearchId: search.supplierSearchId,
      hotelId,
      searchTracingKey: search.searchTracingKey,
    });

    await cacheHotelRoomProviders({ searchId, hotelId, rooms });
    providerName = await getCachedHotelRoomProvider({
      searchId,
      hotelId,
      recommendationId,
    });
  }

  if (!providerName) {
    const error = new Error(
      "Recommendation ID was not found in the hotel's available room rates"
    );
    error.statusCode = 404;
    throw error;
  }

  const adapter = Object.hasOwn(
    supplierPriceVerifyAdapters,
    search.supplierCode
  )
    ? supplierPriceVerifyAdapters[search.supplierCode]
    : null;

  if (!adapter) {
    const error = new Error(
      `Price verification is not configured for supplier: ${search.supplierCode}`
    );
    error.statusCode = 501;
    throw error;
  }

  const response = await adapter.verifyPrice({
    supplierSearchId: search.supplierSearchId,
    hotelId,
    providerName,
    recommendationId,
    searchTracingKey: search.searchTracingKey,
  });

  return {
    searchId: search.internalSearchId,
    supplier: search.supplier,
    pricing: adapter.mapResponse(response),
  };
};
