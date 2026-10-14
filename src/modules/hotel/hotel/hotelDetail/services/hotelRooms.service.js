import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";
import { cacheHotelRoomProviders } from "../../utils/hotelRoomProviderCache.js";
import { hotelRoomsAPI } from "../adapters/akbar/api/hotelRooms.api.js";
import { mapHotelRooms } from "../adapters/akbar/mappers/hotelRooms.mapper.js";

export const getHotelRooms = async ({
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

  const data = await hotelRoomsAPI({
    supplierSearchId: search.supplierSearchId,
    hotelId,
    searchTracingKey: search.searchTracingKey,
  });

  await cacheHotelRoomProviders({ searchId, hotelId, rooms: data });

  return {
    searchId,
    supplier: search.supplier,
    ...mapHotelRooms(data, { page, limit }),
  };
};