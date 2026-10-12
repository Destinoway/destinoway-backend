import { resolveSupplierSearch } from "../utils/resolveSupplierSearch.js";
import { hotelPricingAPI } from "../adapters/akbar/api/hotelPricing.api.js";
import { mapHotelPricing } from "../adapters/akbar/mappers/hotelPricing.mapper.js";

export const getHotelPricing = async ({
  searchId,
  hotelId,
  providerName,
  recommendationId,
}) => {
  if (!hotelId) {
    const error = new Error("Hotel ID is required");
    error.statusCode = 400;
    throw error;
  }

  const search = await resolveSupplierSearch(searchId);

  const data = await hotelPricingAPI({
    supplierSearchId: search.supplierSearchId,
    hotelId,
    providerName,
    recommendationId,
    searchTracingKey: search.searchTracingKey,
  });

  return {
    searchId,
    supplier: search.supplier,
    ...mapHotelPricing(data),
  };
};