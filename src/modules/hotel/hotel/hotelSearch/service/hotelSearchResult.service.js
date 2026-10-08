// import {
//   getHotelSearchMeta,
//   getHotelSearchResultsPaginated,
// } from "./hotelSearch.redis.service.js";

// export const getHotelSearchResults = async ({
//   searchId,
//   page,
//   limit,
// }) => {
//   const meta =
//     await getHotelSearchMeta(
//       searchId
//     );

//   if (!meta) {
//     const error = new Error(
//       "Hotel search not found or expired"
//     );

//     error.statusCode = 404;

//     throw error;
//   }

//   const result =
//     await getHotelSearchResultsPaginated({
//       searchId,
//       page,
//       limit,
//     });

//   return {
//     searchId,

//     supplier: meta.supplier,

//     status: meta.status,

//     contentStatus:
//       meta.contentStatus,

//     rateStatus:
//       meta.rateStatus,

//     totalContent:
//       meta.totalContent,

//     availableHotels:
//       meta.availableHotels,

//     error: meta.error,

//     ...result,
//   };
// };


import {
  getHotelSearchMeta,
  getHotelSearchResultsPaginated,
} from "./hotelSearch.redis.service.js";

import {
  mapHotelSearchResponse,
} from "../mappers/hotelSearch.response.mapper.js";

export const getHotelSearchResults = async ({
  searchId,
  page,
  limit,
}) => {
  // Get search metadata from Redis
  const meta = await getHotelSearchMeta(searchId);

  if (!meta) {
    const error = new Error(
      "Hotel search not found or expired"
    );

    error.statusCode = 404;

    throw error;
  }

  // Get paginated results from Redis
  const result = await getHotelSearchResultsPaginated({
    searchId,
    page,
    limit,
  });

  // Build internal response
  const response = {
    searchId,

    // Frontend should receive supplier ID, not supplier name
    supplier: "1",

    status: meta.status,

    contentStatus: meta.contentStatus,

    rateStatus: meta.rateStatus,

    totalContent: meta.totalContent,

    availableHotels: meta.availableHotels,

    error: meta.error,

    ...result,
  };

  // Convert internal Redis data
  // into clean frontend response
  return mapHotelSearchResponse(response);
};