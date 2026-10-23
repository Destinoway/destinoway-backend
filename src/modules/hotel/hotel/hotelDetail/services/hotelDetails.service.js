import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";

import { hotelContentAPI } from "../adapters/akbar/api/hotelContent.api.js";

import { mapHotelContent } from "../adapters/akbar/mappers/hotelContent.mapper.js";
import {
  getHotelSearchMeta,
  getHotelSearchResults,
} from "../../hotelSearch/service/hotelSearch.redis.service.js";
import {
  loadHotelPricingConfig,
  priceHotelForSearch,
} from "../../../../priceMarkup/pricing/hotelPricing.service.js";

const getSupplierHotelId = (hotel) =>
  hotel?.supplierHotelId ??
  hotel?.supplierHotelID ??
  hotel?.hotelId ??
  hotel?.HotelId ??
  hotel?.id;

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
  const mappedContent = mapHotelContent(content);

  // Use the hotel rate retained from this search, so detail pricing matches
  // the same supplier quote and markup/coupon rules shown in search results.
  const [searchMeta, searchHotels] = await Promise.all([
    getHotelSearchMeta(search.internalSearchId),
    getHotelSearchResults(search.internalSearchId),
  ]);
  const searchHotel = searchHotels.find(
    (hotel) => String(getSupplierHotelId(hotel)) === String(hotelId),
  );

  if (searchHotel) {
    const pricingConfig = await loadHotelPricingConfig(
      searchMeta?.destinationCountryCode || "IN",
    );
    const pricedHotel = priceHotelForSearch(searchHotel, searchMeta ?? {}, pricingConfig);
    mappedContent.hotel.price = pricedHotel.customerPrice;
  }

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
      data: mappedContent,
    },
  };
};
