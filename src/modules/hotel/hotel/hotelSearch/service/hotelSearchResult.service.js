import {
  getHotelSearchMeta,
  getHotelSearchResultsPaginated,
} from "./hotelSearch.redis.service.js";

export const getHotelSearchResults = async ({
  searchId,
  page,
  limit,
}) => {
  const meta =
    await getHotelSearchMeta(
      searchId
    );

  if (!meta) {
    const error = new Error(
      "Hotel search not found or expired"
    );

    error.statusCode = 404;

    throw error;
  }

  const result =
    await getHotelSearchResultsPaginated({
      searchId,
      page,
      limit,
    });

  return {
    searchId,

    supplier: meta.supplier,

    status: meta.status,

    contentStatus:
      meta.contentStatus,

    rateStatus:
      meta.rateStatus,

    totalContent:
      meta.totalContent,

    availableHotels:
      meta.availableHotels,

    error: meta.error,

    ...result,
  };
};