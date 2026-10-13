import { resolveSupplierSearch } from "../utils/resolveSupplierSearch.js";

import { hotelContentAPI } from "../adapters/akbar/api/hotelContent.api.js";
import { hotelRoomsAPI } from "../adapters/akbar/api/hotelRooms.api.js";

import { mapHotelContent } from "../adapters/akbar/mappers/hotelContent.mapper.js";
import { mapHotelRooms } from "../adapters/akbar/mappers/hotelRooms.mapper.js";

const parsePage = (page) => {
  const parsed = Number(page);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : 1;
};

export const getHotelDetails = async ({
  searchId,
  hotelId,
  page,
  limit,
}) => {
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

  const currentPage = parsePage(page);
  const [contentResult, roomsResult] = await Promise.allSettled([
    currentPage === 1
      ? hotelContentAPI(request)
      : Promise.resolve(null),
    hotelRoomsAPI(request),
  ]);

  return {
    searchId: search.internalSearchId,
    supplier: search.supplier,
    ...(currentPage === 1
      ? {
          content:
            contentResult.status === "fulfilled"
              ? {
                  success: true,
                  data: mapHotelContent(contentResult.value),
                }
              : {
                  success: false,
                  error:
                    contentResult.reason?.message ??
                    "Content request failed",
                },
        }
      : {}),
    rooms:
      roomsResult.status === "fulfilled"
        ? {
            success: true,
            data: mapHotelRooms(roomsResult.value, { page, limit }),
          }
        : {
            success: false,
            error: roomsResult.reason?.message ?? "Rooms request failed",
          },
  };
};