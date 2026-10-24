import { resolveSupplierSearch } from "../../utils/resolveSupplierSearch.js";
import {
  cacheHotelRoomProviders,
  getCachedHotelRoomProvider,
} from "../../utils/hotelRoomProviderCache.js";
import { getHotelSearchResults } from "../../hotelSearch/service/hotelSearch.redis.service.js";
import { akbarHotelPriceVerifyAPI } from "../adapters/akbar/api/hotelPriceVerify.api.js";
import { mapAkbarHotelPriceVerifyResponse } from "../adapters/akbar/mappers/hotelPriceVerify.mapper.js";
import { hotelRoomsAPI } from "../../hotelDetail/adapters/akbar/api/hotelRooms.api.js";
import HotelItinerary from "../../itinerary/hotelItinerary.model.js";
import Coupon from "../../../../promotionEngine/coupon.model.js";
import {
  findBestCouponFromList,
} from "../../../../promotionEngine/promotion.service.js";
import {
  loadHotelPricingConfig,
  priceHotelForSearch,
} from "../../../../priceMarkup/pricing/hotelPricing.service.js";
import { getHotelSearchMeta } from "../../hotelSearch/service/hotelSearch.redis.service.js";

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
  facilities: getNames(room?.room?.facilities),
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
  userId,
}) => {
  const { search, hotel, supplierHotel, pricing } =
    await getHotelPriceVerificationContext({
      searchId,
      hotelId,
      recommendationId,
    });

  const roomGroups = Array.isArray(pricing?.roomGroup)
    ? pricing.roomGroup
    : [];
  const refundability = roomGroups.map(getRefundable);

  const responseData = {
    searchId: search.internalSearchId,
    supplier: search.supplier,
    hotel: {
      hotelId: String(hotelId),
      name: hotel.name ?? null,
      address: formatHotelAddress(hotel.address),
      starCategory: hotel.starRating ?? null,
      facilities: [
        ...new Set([
          ...getNames(hotel.facilities),
          ...getNames(supplierHotel.facilityGroups),
        ]),
      ],
    },
    stay: {
      checkIn: search.checkIn,
      checkOut: search.checkOut,
    },
    pricing: {
      refundable:
        roomGroups.length > 0 &&
        refundability.every((value) => value !== null)
        ? refundability.every(Boolean)
        : null,
      rooms: roomGroups.map((room) => mapVerifiedRoom(room, search.occupancies)),
    },
  };

  if (!userId) return responseData;

  const searchMeta = await getHotelSearchMeta(search.internalSearchId);
  const pricingConfig = await loadHotelPricingConfig(
    searchMeta?.destinationCountryCode || "IN",
  );
  const configWithoutAutoCoupon = { ...pricingConfig, autoCoupons: [] };
  const pricedRooms = roomGroups.map((room) => {
    const supplierTotal = Number(room?.totalRate) || 0;
    const pricedHotel = priceHotelForSearch(
      {
        ...hotel,
        rate: { ...(hotel.rate ?? {}), total: supplierTotal },
        currency: room?.conversionRate?.toCurrency ?? room?.currency ?? "INR",
      },
      searchMeta ?? {},
      configWithoutAutoCoupon,
    );
    const roomCount = Number(room?.roomCount ?? 1) || 1;
    return {
      supplierRoom: room,
      customerPrice: pricedHotel.customerPrice,
      roomCount,
    };
  });
  const totalBeforeCoupon = Number(
    pricedRooms.reduce(
      (sum, item) => sum + item.customerPrice.totalPriceBeforeCoupon * item.roomCount,
      0,
    ).toFixed(2),
  );
  const serviceTax = Number(
    pricedRooms.reduce(
      (sum, item) => sum + item.customerPrice.serviceTaxAmount * item.roomCount,
      0,
    ).toFixed(2),
  );
  const baseForCoupon = Math.max(0, totalBeforeCoupon - serviceTax);
  const now = new Date();
  const coupons = await Coupon.find({
    applicableModules: "hotel",
    isActive: true,
    minAmount: { $lte: baseForCoupon },
    "validity.startDate": { $lte: now },
    "validity.endDate": { $gte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  }).lean();
  const couponInputs = {
    coupons,
    bookingAmount: baseForCoupon,
    serviceTax,
  };
  const autoCouponResult = findBestCouponFromList({
    ...couponInputs,
    coupons: coupons.filter((coupon) => coupon.isAutoApply),
  });
  const availableCoupons = findBestCouponFromList(couponInputs).availableCoupons;
  const selectedCoupon = autoCouponResult.bestCoupon;
  const couponDiscount = autoCouponResult.bestDiscount;
  const currency = roomGroups[0]?.conversionRate?.toCurrency ?? "INR";
  const finalPrice = Number((totalBeforeCoupon - couponDiscount).toFixed(2));
  let allocatedCouponDiscount = 0;
  const pricedRoomsWithCoupon = pricedRooms.map((item, index) => {
    const isLastRoom = index === pricedRooms.length - 1;
    const groupDiscount = isLastRoom
      ? Number((couponDiscount - allocatedCouponDiscount).toFixed(2))
      : Number(
          (
            (couponDiscount *
              item.customerPrice.totalPriceBeforeCoupon *
              item.roomCount) /
            (totalBeforeCoupon || 1)
          ).toFixed(2),
        );
    allocatedCouponDiscount += groupDiscount;
    const perRoomDiscount = Number((groupDiscount / item.roomCount).toFixed(2));
    return {
      ...item,
      customerPrice: {
        ...item.customerPrice,
        totalPrice: Number(
          (item.customerPrice.totalPriceBeforeCoupon - perRoomDiscount).toFixed(2),
        ),
        appliedCouponCode: selectedCoupon?.code ?? null,
        appliedCouponTitle: selectedCoupon?.title ?? null,
        couponDiscount: perRoomDiscount,
      },
    };
  });

  const draft = await HotelItinerary.findOneAndUpdate(
    {
      userId,
      searchId: search.internalSearchId,
      hotelId: String(hotelId),
      recommendationId: String(recommendationId),
      itineraryStatus: "draft",
    },
    {
      $set: {
        supplierSearchId: String(search.supplierSearchId),
        supplier: search.supplier,
        hotel: responseData.hotel,
        stay: responseData.stay,
        verifiedPrice: pricing,
        price: {
          supplierTotal: pricedRooms.reduce(
            (sum, item) => sum + (Number(item.supplierRoom?.totalRate) || 0) * item.roomCount,
            0,
          ),
          totalBeforeCoupon,
          serviceTax,
          couponBaseAmount: baseForCoupon,
          total: finalPrice,
          currency,
          roomGroups: pricedRoomsWithCoupon.map(({ supplierRoom, customerPrice, roomCount }) => ({
            roomGroupId: supplierRoom.id ?? null,
            roomId: supplierRoom.room?.id ?? null,
            providerName: supplierRoom.providerName ?? null,
            roomCount,
            baseRate: supplierRoom.baseRate ?? null,
            totalRate: supplierRoom.totalRate ?? null,
            customerPrice,
          })),
        },
        offer: {
          couponCode: selectedCoupon?.code ?? null,
          couponDiscount,
        },
      },
      $unset: { bookingRefNo: "" },
      $setOnInsert: {
        userId,
        searchId: search.internalSearchId,
        hotelId: String(hotelId),
        recommendationId: String(recommendationId),
        itineraryStatus: "draft",
        paymentStatus: "pending",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return {
    ...responseData,
    itineraryId: String(draft._id),
    availableCoupons,
    appliedCoupon: selectedCoupon?.code ?? null,
    couponDiscount,
    totalPayable: finalPrice,
    currency,
    pricing: {
      ...responseData.pricing,
      rooms: responseData.pricing.rooms.map((room, index) => ({
        ...room,
        customerPrice: pricedRoomsWithCoupon[index]?.customerPrice ?? null,
      })),
    },
  };
};

export const getHotelPriceVerificationContext = async ({
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
      correlationId: search.internalSearchId,
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

  return {
    search,
    hotel,
    supplierHotel: hotel.rawSupplierData ?? {},
    pricing,
  };
};
