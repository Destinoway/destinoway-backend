
import {
  getHotelSearchMeta,
  getHotelSearchResults as getAllHotelSearchResults,
} from "./hotelSearch.redis.service.js";

import {
  mapHotelSearchResponse,
} from "../adapters/akbar/hotelSearch/mappers/hotelSearch.response.mapper.js";

// =========================================================
// HELPERS
// =========================================================

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  return null;
};

const parseList = (value) => {
  if (!value) return [];

  const values = Array.isArray(value)
    ? value
    : String(value).split(",");

  return values
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const normalizeText = (value) =>
  String(value ?? "").trim().toLowerCase();

const getHotelPrice = (hotel) =>
  Number(
    hotel.price?.totalPrice ??
    hotel.rate?.total ??
    0
  );

const getHotelAmenities = (hotel) => {
  const facilities = Array.isArray(hotel.facilities)
    ? hotel.facilities
    : [];

  const names = facilities.map((facility) =>
    typeof facility === "string"
      ? facility
      : facility?.name
  );

  // Free Breakfast is a rate benefit, not necessarily
  // a physical hotel facility.
  if (hotel.freeBreakfast === true) {
    names.push("Free Breakfast");
  }

  return names.map(normalizeText).filter(Boolean);
};

// =========================================================
// SEARCH, FILTER, SORT AND PAGINATION
// =========================================================

export const getHotelSearchResults = async ({
  searchId,
  page = 1,
  limit = 20,

  // Search
  hotelName,

  // Price
  minPrice,
  maxPrice,

  // Rating
  starRatings,

  // Amenities: comma-separated or array
  amenities,

  // Sorting
  sortBy = "price",
  sortOrder = "asc",
}) => {
  // 1. Check search metadata
  const meta = await getHotelSearchMeta(searchId);

  if (!meta) {
    const error = new Error(
      "Hotel search not found or expired"
    );

    error.statusCode = 404;
    throw error;
  }

  // 2. Read all currently available results from Redis.
  // Redis data is not modified.
  const allHotels = await getAllHotelSearchResults(searchId);

  // 3. Normalize query values
  const safePage = Math.max(
    Math.floor(parseNumber(page) ?? 1),
    1
  );

  const safeLimit = Math.min(
    Math.max(Math.floor(parseNumber(limit) ?? 20), 1),
    100
  );

  const parsedMinPrice = parseNumber(minPrice);
  const parsedMaxPrice = parseNumber(maxPrice);

  const ratings = parseList(starRatings)
    .map(Number)
    .filter(Number.isFinite);

  const selectedAmenities = parseList(amenities)
    .map(normalizeText);

  const normalizedHotelName = normalizeText(hotelName);

  // 4. Filter hotels
  const filteredHotels = allHotels.filter((hotel) => {
    const price = getHotelPrice(hotel);
    const rating = Number(hotel.starRating ?? 0);

    // Hotel name search
    if (
      normalizedHotelName &&
      !normalizeText(hotel.name).includes(normalizedHotelName)
    ) {
      return false;
    }

    // Minimum price
    if (
      parsedMinPrice !== null &&
      price < parsedMinPrice
    ) {
      return false;
    }

    // Maximum price
    if (
      parsedMaxPrice !== null &&
      price > parsedMaxPrice
    ) {
      return false;
    }

    // Multiple star ratings: any selected rating can match
    if (
      ratings.length > 0 &&
      !ratings.includes(rating)
    ) {
      return false;
    }

    // Multiple amenities: OR logic
    if (selectedAmenities.length > 0) {
      const hotelAmenities = getHotelAmenities(hotel);

      const hasSelectedAmenity = selectedAmenities.some(
        (amenity) => hotelAmenities.includes(amenity)
      );

      if (!hasSelectedAmenity) {
        return false;
      }
    }

    return true;
  });

  // 5. Sort filtered hotels
  const allowedSortFields = [
    "price",
    "rating",
    "distance",
    "name",
  ];

  const selectedSortField = allowedSortFields.includes(sortBy)
    ? sortBy
    : "price";

  const direction = sortOrder === "desc" ? -1 : 1;

  filteredHotels.sort((a, b) => {
    let valueA;
    let valueB;

    switch (selectedSortField) {
      case "rating":
        valueA = Number(a.starRating ?? 0);
        valueB = Number(b.starRating ?? 0);
        break;

      case "distance":
        valueA = Number(a.distance ?? Infinity);
        valueB = Number(b.distance ?? Infinity);
        break;

      case "name":
        valueA = normalizeText(a.name);
        valueB = normalizeText(b.name);
        break;

      case "price":
      default:
        valueA = getHotelPrice(a);
        valueB = getHotelPrice(b);
        break;
    }

    if (valueA < valueB) return -1 * direction;
    if (valueA > valueB) return 1 * direction;

    return 0;
  });

  // 6. Paginate after filtering and sorting
  const total = filteredHotels.length;
  const startIndex = (safePage - 1) * safeLimit;

  const items = filteredHotels.slice(
    startIndex,
    startIndex + safeLimit
  );

  // 7. Build response
  const response = {
    searchId,
    supplier: "1",
    status: meta.status,
    contentStatus: meta.contentStatus,
    rateStatus: meta.rateStatus,
    totalContent: meta.totalContent,
    availableHotels: meta.availableHotels,
    error: meta.error,

    items,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: startIndex + safeLimit < total,
    },
  };

  // 8. Return frontend-safe response
  return mapHotelSearchResponse(response);
};



// import {
//   getHotelSearchMeta,
//   getHotelSearchResultsPaginated,
// } from "./hotelSearch.redis.service.js";

// import {
//   mapHotelSearchResponse,
// } from "../adapters/akbar/hotelSearch/mappers/hotelSearch.response.mapper.js";

// export const getHotelSearchResults = async ({
//   searchId,
//   page,
//   limit,
// }) => {
//   // Get search metadata from Redis
//   const meta = await getHotelSearchMeta(searchId);

//   if (!meta) {
//     const error = new Error(
//       "Hotel search not found or expired"
//     );

//     error.statusCode = 404;

//     throw error;
//   }

//   // Get paginated results from Redis
//   const result = await getHotelSearchResultsPaginated({
//     searchId,
//     page,
//     limit,
//   });

//   // Build internal response
//   const response = {
//     searchId,

//     // Frontend should receive supplier ID, not supplier name
//     supplier: "1",

//     status: meta.status,

//     contentStatus: meta.contentStatus,

//     rateStatus: meta.rateStatus,

//     totalContent: meta.totalContent,

//     availableHotels: meta.availableHotels,

//     error: meta.error,

//     ...result,
//   };

//   // Convert internal Redis data
//   // into clean frontend response
//   return mapHotelSearchResponse(response);
// };