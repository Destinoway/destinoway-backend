import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";

import { hotelContentAPI } from "../adapters/akbar/api/hotelContent.api.js";

import { mapHotelContent } from "../adapters/akbar/mappers/hotelContent.mapper.js";

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

  const content = await hotelContentAPI(request);

  return {
    searchId: search.internalSearchId,
    supplier: search.supplier,
    stayPeriod: {
      checkIn: search.checkIn,
      checkOut: search.checkOut,
    },
    occupancies: search.occupancies,
    content: {
      success: true,
      data: mapHotelContent(content),
    },
  };
};