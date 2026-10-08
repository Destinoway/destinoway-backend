import redisClient from "../../../../../config/redis.js";

const SEARCH_TTL = 60 * 60; // 1 hour

const getMetaKey = (searchId) =>
  `hotel-search:${searchId}:meta`;

const getResultsKey = (searchId) =>
  `hotel-search:${searchId}:results`;

/**
 * Create initial search state
 */
export const createHotelSearchState = async ({
  searchId,
  supplier = "AKBAR",
}) => {
  const meta = {
    searchId,
    supplier,
    status: "processing",

    contentStatus: "processing",
    rateStatus: "inprogress",

    totalContent: 0,
    availableHotels: 0,

    error: null,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redisClient.set(
    getMetaKey(searchId),
    JSON.stringify(meta),
    {
      EX: SEARCH_TTL,
    }
  );

  await redisClient.set(
    getResultsKey(searchId),
    JSON.stringify([]),
    {
      EX: SEARCH_TTL,
    }
  );

  return meta;
};

/**
 * Get search metadata
 */
export const getHotelSearchMeta = async (searchId) => {
  const data = await redisClient.get(
    getMetaKey(searchId)
  );

  if (!data) {
    return null;
  }

  return JSON.parse(data);
};

/**
 * Update search metadata
 */
export const updateHotelSearchMeta = async (
  searchId,
  updates
) => {
  const current = await getHotelSearchMeta(searchId);

  if (!current) {
    throw new Error(
      `Hotel search state not found: ${searchId}`
    );
  }

  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await redisClient.set(
    getMetaKey(searchId),
    JSON.stringify(updated),
    {
      EX: SEARCH_TTL,
    }
  );

  return updated;
};

/**
 * Save hotel results
 */
export const setHotelSearchResults = async (
  searchId,
  hotels
) => {
  await redisClient.set(
    getResultsKey(searchId),
    JSON.stringify(hotels || []),
    {
      EX: SEARCH_TTL,
    }
  );

  await updateHotelSearchMeta(searchId, {
    availableHotels: hotels?.length || 0,
  });
};

/**
 * Get all currently available hotel results
 */
export const getHotelSearchResults = async (
  searchId
) => {
  const data = await redisClient.get(
    getResultsKey(searchId)
  );

  if (!data) {
    return [];
  }

  return JSON.parse(data);
};

/**
 * Get paginated hotel results
 */
export const getHotelSearchResultsPaginated = async ({
  searchId,
  page = 1,
  limit = 20,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const hotels = await getHotelSearchResults(
    searchId
  );

  const total = hotels.length;

  const startIndex =
    (safePage - 1) * safeLimit;

  const endIndex =
    startIndex + safeLimit;

  const items = hotels.slice(
    startIndex,
    endIndex
  );

  return {
    items,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: endIndex < total,
    },
  };
};

/**
 * Mark search as completed
 */
export const completeHotelSearch = async (
  searchId,
  data = {}
) => {
  return updateHotelSearchMeta(searchId, {
    status: "completed",
    contentStatus:
      data.contentStatus || "completed",
    rateStatus:
      data.rateStatus || "completed",
    availableHotels:
      data.availableHotels ?? 0,
  });
};

/**
 * Mark search as failed
 */
export const failHotelSearch = async (
  searchId,
  error
) => {
  return updateHotelSearchMeta(searchId, {
    status: "failed",
    contentStatus: "failed",
    rateStatus: "failed",
    error:
      error?.message ||
      String(error) ||
      "Hotel search failed",
  });
};