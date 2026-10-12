import { resolveSupplierSearch } from "../utils/resolveSupplierSearch.js";

import { hotelContentAPI } from "../adapters/akbar/api/hotelContent.api.js";
import { hotelRoomsAPI } from "../adapters/akbar/api/hotelRooms.api.js";

import { mapHotelContent } from "../adapters/akbar/mappers/hotelContent.mapper.js";
import { mapHotelRooms } from "../adapters/akbar/mappers/hotelRooms.mapper.js";

export const getHotelDetails = async ({ searchId, hotelId }) => {
  if (!hotelId) {
    const error = new Error("Hotel ID is required");
    error.statusCode = 400;
    throw error;
  }

  const search = await resolveSupplierSearch(searchId);

  const request = {
    supplierSearchId: search.supplierSearchId,
    hotelId,
    searchTracingKey: search.searchTracingKey,
  };

  const [contentResult, roomsResult] = await Promise.allSettled([
    hotelContentAPI(request),
    hotelRoomsAPI(request),
  ]);

  return {
    searchId: search.internalSearchId,
    supplier: search.supplier,
    content:
      contentResult.status === "fulfilled"
        ? {
            success: true,
            data: mapHotelContent(contentResult.value),
          }
        : {
            success: false,
            error: contentResult.reason?.message ?? "Content request failed",
          },
    rooms:
      roomsResult.status === "fulfilled"
        ? {
            success: true,
            data: mapHotelRooms(roomsResult.value),
          }
        : {
            success: false,
            error: roomsResult.reason?.message ?? "Rooms request failed",
          },
  };
};