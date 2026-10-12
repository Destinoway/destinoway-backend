const pick = (source, fields) => {
  if (!source || typeof source !== "object") {
    return source;
  }

  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]])
  );
};

const mapItems = (items, fields) =>
  Array.isArray(items)
    ? items.map((item) => pick(item, fields))
    : items;

const mapRoom = (room) => ({
  ...pick(room, [
    "id",
    "standardRoomId",
    "standardRoomName",
    "name",
    "description",
    "smokingAllowed",
    "maxGuestAllowed",
    "maxAdultAllowed",
    "maxChildrenAllowed",
    "area",
    "views",
    "type",
  ]),
  beds: mapItems(room?.beds, ["type", "description", "count"]),
  facilities: mapItems(room?.facilities, ["name"]),
  images: mapItems(room?.images, ["url", "caption"]),
});

const mapRateComponents = (items) =>
  mapItems(items, ["amount", "description", "type"]);

const mapDailyRates = (items) =>
  mapItems(items, ["date", "amount", "taxIncluded", "discount"]);

const mapPolicies = (items) =>
  mapItems(items, ["type", "text", "rules"]);

const mapAdditionalCharges = (items) =>
  Array.isArray(items)
    ? items.map((item) => ({
        ...pick(item, ["text"]),
        charge: pick(item?.charge, [
          "description",
          "frequency",
          "unit",
          "amount",
          "currency",
        ]),
      }))
    : items;

const mapRoomGroup = (group) => ({
  ...pick(group, [
    "id",
    "availability",
    "description",
    "needsPriceCheck",
    "isPackageRate",
    "providerName",
    "isPreffered",
    "roomCount",
    "type",
    "baseRate",
    "totalRate",
    "tcsOnTotal",
    "minSellingRate",
    "publishedRate",
    "hotelServiceCharge",
    "refundability",
    "refundable",
    "allGuestsInfoRequired",
    "onlineCancellable",
    "specialRequestSupported",
    "payAtHotel",
    "cardRequired",
    "depositRequired",
    "depositAmount",
    "guaranteeRequired",
    "bookNowPayLaterDate",
    "ratePerNight",
  ]),
  occupancies: mapItems(group?.occupancies, [
    "occupancyId",
    "numOfAdults",
    "numOfChildren",
    "childAges",
  ]),
  taxes: mapRateComponents(group?.taxes),
  fees: mapRateComponents(group?.fees),
  discounts: mapRateComponents(group?.discounts),
  otherRateComponents: mapRateComponents(group?.otherRateComponents),
  commission: pick(group?.commission, ["amount", "description", "type"]),
  dailyRates: mapDailyRates(group?.dailyRates),
  policies: mapPolicies(group?.policies),
  boardBasis: pick(group?.boardBasis, ["description", "type"]),
  offers: mapItems(group?.offers, ["name", "description", "type", "amount"]),
  cancellationPolicies: mapPolicies(group?.cancellationPolicies),
  includes: group?.includes,
  additionalCharges: mapAdditionalCharges(group?.additionalCharges),
  room: mapRoom(group?.room),
});

const mapRecommendation = (recommendation) => ({
  ...pick(recommendation, [
    "id",
    "total",
    "publishedRate",
    "isHold",
    "isGSTInvoiceAvailable",
    "isPANRequired",
  ]),
  roomGroup: Array.isArray(recommendation?.roomGroup)
    ? recommendation.roomGroup.map(mapRoomGroup)
    : [],
});

const mapRooms = (rooms) => {
  if (!rooms || typeof rooms !== "object") {
    return rooms;
  }

  return {
    ...pick(rooms, ["stayPeriod", "status"]),
    recommendations: Array.isArray(rooms.recommendations)
      ? rooms.recommendations.map(mapRecommendation)
      : [],
  };
};

export const mapHotelRooms = (data) => ({
  rooms: mapRooms(
    data?.rooms ?? data?.data?.rooms ?? data?.data ?? data
  ),
});
