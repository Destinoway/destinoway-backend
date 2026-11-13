import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";
import { cacheHotelRoomProviders } from "../../utils/hotelRoomProviderCache.js";
import { hotelRoomsAPI } from "../adapters/akbar/api/hotelRooms.api.js";
import { mapHotelRooms } from "../adapters/akbar/mappers/hotelRooms.mapper.js";
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

const getCustomerPrice = (amount, hotel, searchMeta, pricingConfig) => {
  const priced = priceHotelForSearch(
    {
      ...hotel,
      rate: { ...(hotel?.rate ?? {}), total: Number(amount) || 0 },
      currency: hotel?.currency ?? "INR",
    },
    searchMeta ?? {},
    pricingConfig,
  );
  return priced.customerPrice;
};

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
    correlationId: search.internalSearchId,
    supplierSearchId: search.supplierSearchId,
    hotelId,
    searchTracingKey: search.searchTracingKey,
  });

  await cacheHotelRoomProviders({ searchId, hotelId, rooms: data });

  const [searchMeta, searchHotels] = await Promise.all([
    getHotelSearchMeta(search.internalSearchId),
    getHotelSearchResults(search.internalSearchId),
  ]);
  const hotelContext = searchHotels.find(
    (hotel) => String(getSupplierHotelId(hotel)) === String(hotelId),
  ) ?? { supplierHotelId: hotelId };
  const pricingConfig = await loadHotelPricingConfig(
    searchMeta?.destinationCountryCode || "IN",
  );
  const mappedRooms = mapHotelRooms(data, { page, limit });

  for (const recommendation of mappedRooms.rooms?.recommendations ?? []) {
    const supplierTotalAmount = Number(recommendation.total) || 0;
    const price = getCustomerPrice(
      supplierTotalAmount,
      hotelContext,
      searchMeta,
      pricingConfig,
    );
    recommendation.supplierTotalAmount = supplierTotalAmount;
    recommendation.total = price.totalPrice;
    recommendation.price = price;

    for (const roomGroup of recommendation.roomGroup ?? []) {
      const supplierTotalRate = Number(roomGroup.totalRate) || 0;
      const supplierBaseRate = Number(roomGroup.baseRate) || 0;
      const groupPrice = getCustomerPrice(
        supplierTotalRate,
        hotelContext,
        searchMeta,
        pricingConfig,
      );
      roomGroup.supplierBaseRate = supplierBaseRate;
      roomGroup.supplierTotalRate = supplierTotalRate;
      roomGroup.baseRate = groupPrice.basePrice;
      roomGroup.totalRate = groupPrice.totalPrice;
      roomGroup.price = groupPrice;
    }
  }

  return {
    searchId,
    supplier: search.supplier,
    ...mappedRooms,
  };
};
