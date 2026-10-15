import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";
import {
  cacheHotelRoomProviders,
  getCachedHotelRoomProvider,
} from "../../utils/hotelRoomProviderCache.js";
import { getHotelSearchResults } from "../../hotelSearch/service/hotelSearch.redis.service.js";
import { akbarHotelPriceVerifyAPI } from "../adapters/akbar/api/hotelPriceVerify.api.js";
import { mapAkbarHotelPriceVerifyResponse } from "../adapters/akbar/mappers/hotelPriceVerify.mapper.js";
import { hotelRoomsAPI } from "../../hotelDetail/adapters/akbar/api/hotelRooms.api.js";

const getNames = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter((name) => typeof name === "string" && name.trim());

const formatHotelAddress = (address) => {
  if (typeof address === "string") {
    return address;
  }

  if (!address || typeof address !== "object") {
    return null;
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(", ");
};

const getTime = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  return (
    value.time ??
    value.from ??
    value.start ??
    value.checkinStart ??
    value.checkInStart ??
    value.checkinTime ??
    value.checkInTime ??
    null
  );
};

const getRefundable = (room) => {
  if (typeof room?.refundable === "boolean") {
    return room.refundable;
  }

  if (typeof room?.refundability === "string") {
    return room.refundability.toLowerCase() === "refundable";
  }

  return null;
};

const mapRoomPrice = (room) => ({
  baseRate: room?.baseRate ?? null,
  totalRate: room?.totalRate ?? null,
  currency: room?.conversionRate?.toCurrency ?? null,
});

const mapVerifiedRoom = (room, occupancies) => ({
  name:
    room?.room?.standardRoomName ??
    room?.room?.name ??
    null,
  description: room?.room?.description ?? null,
  roomCount: room?.roomCount ?? 1,
  beds: room?.room?.beds ?? [],
  amenities: getNames(room?.room?.facilities),
  boardBasis: room?.boardBasis?.description ?? null,
  occupancies: room?.occupancies ?? occupancies,
  refundable: getRefundable(room),
  price: mapRoomPrice(room),
});

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

  const pricing = adapter.mapResponse(response);
  const searchHotels = await getHotelSearchResults(search.internalSearchId);
  const hotel = searchHotels.find(
    (item) => String(item.supplierHotelId) === String(hotelId)
  );

  if (!hotel) {
    const error = new Error(
      "Hotel details are not available for this search"
    );
    error.statusCode = 404;
    throw error;
  }

  const supplierHotel = hotel.rawSupplierData ?? {};
  const roomGroups = Array.isArray(pricing?.roomGroup)
    ? pricing.roomGroup
    : [];
  const refundability = roomGroups.map(getRefundable);

  return {
    searchId: search.internalSearchId,
    supplier: search.supplier,
    hotel: {
      hotelId: String(hotelId),
      name: hotel.name ?? null,
      address: formatHotelAddress(hotel.address),
      starCategory: hotel.starRating ?? null,
      amenities: [
        ...new Set([
          ...getNames(hotel.facilities),
          ...getNames(supplierHotel.facilityGroups),
        ]),
      ],
    },
    stay: {
      checkIn: {
        date: search.checkIn,
        time: getTime(supplierHotel.checkinInfo),
      },
      checkOut: {
        date: search.checkOut,
        time: getTime(supplierHotel.checkoutInfo),
      },
    },
    guestDetails: search.occupancies,
    pricing: {
      refundable:
        roomGroups.length > 0 &&
        refundability.every((value) => value !== null)
        ? refundability.every(Boolean)
        : null,
      rooms: roomGroups.map((room) =>
        mapVerifiedRoom(room, search.occupancies)
      ),
    },
  };
};
