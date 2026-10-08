import redisClient from "../../../../../config/redis.js";

const SEARCH_TTL = 60 * 60; // 1 hour

const getMetaKey = (searchId) =>
  `hotel-search:${searchId}:meta`;

const getResultsKey = (searchId) =>
  `hotel-search:${searchId}:results`;

const getActiveSearchKey = (searchSessionId) =>
  `hotel-search:session:${searchSessionId}:active`;

const getCancelledKey = (searchId) =>
  `hotel-search:${searchId}:cancelled`;

// =========================================================
// CREATE SEARCH STATE
// =========================================================

export const createHotelSearchState = async ({
  searchId,
  searchSessionId,
  supplier = "AKBAR",
}) => {
  const meta = {
    searchId,
    searchSessionId,
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

  // This search is now active for this anonymous browser/session
  await redisClient.set(
    getActiveSearchKey(searchSessionId),
    searchId,
    {
      EX: SEARCH_TTL,
    }
  );

  // In case same searchId was somehow reused
  await redisClient.del(
    getCancelledKey(searchId)
  );

  return meta;
};

// =========================================================
// GET META
// =========================================================

export const getHotelSearchMeta = async (
  searchId
) => {
  const data = await redisClient.get(
    getMetaKey(searchId)
  );

  return data ? JSON.parse(data) : null;
};

// =========================================================
// GET ACTIVE SEARCH FOR ANONYMOUS SESSION
// =========================================================

export const getActiveSearchId = async (
  searchSessionId
) => {
  if (!searchSessionId) {
    return null;
  }

  return await redisClient.get(
    getActiveSearchKey(searchSessionId)
  );
};

// =========================================================
// CHECK WHETHER SEARCH IS STILL ACTIVE
// =========================================================

export const isHotelSearchActive = async (
  searchId,
  searchSessionId
) => {
  if (!searchId || !searchSessionId) {
    return false;
  }

  const cancelled = await redisClient.get(
    getCancelledKey(searchId)
  );

  if (cancelled) {
    return false;
  }

  const activeSearchId =
    await getActiveSearchId(searchSessionId);

  if (activeSearchId !== searchId) {
    return false;
  }

  const meta =
    await getHotelSearchMeta(searchId);

  if (!meta) {
    return false;
  }

  if (
    meta.status === "cancelled" ||
    meta.status === "failed"
  ) {
    return false;
  }

  return true;
};

// =========================================================
// UPDATE META
// =========================================================

export const updateHotelSearchMeta = async (
  searchId,
  updates
) => {
  const current =
    await getHotelSearchMeta(searchId);

  if (!current) {
    return null;
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

// =========================================================
// SET RESULTS
// =========================================================

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

  await updateHotelSearchMeta(
    searchId,
    {
      availableHotels:
        hotels?.length || 0,
    }
  );
};

// =========================================================
// GET RESULTS
// =========================================================

export const getHotelSearchResults = async (
  searchId
) => {
  const data = await redisClient.get(
    getResultsKey(searchId)
  );

  return data ? JSON.parse(data) : [];
};

// =========================================================
// PAGINATED RESULTS
// =========================================================

export const getHotelSearchResultsPaginated = async ({
  searchId,
  page = 1,
  limit = 20,
}) => {
  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const hotels =
    await getHotelSearchResults(searchId);

  const total = hotels.length;

  const startIndex =
    (safePage - 1) * safeLimit;

  const endIndex =
    startIndex + safeLimit;

  return {
    items: hotels.slice(
      startIndex,
      endIndex
    ),

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: endIndex < total,
    },
  };
};

// =========================================================
// CANCEL + DELETE SEARCH
// =========================================================

export const cancelAndDeleteHotelSearch = async (
  searchId,
  searchSessionId
) => {
  if (!searchId) {
    return;
  }

  // First create cancellation marker.
  // Background job will see this and stop.
  await redisClient.set(
    getCancelledKey(searchId),
    "1",
    {
      EX: SEARCH_TTL,
    }
  );

  // Remove active session pointer only
  // if it still points to this search.
  if (searchSessionId) {
    const activeSearchId =
      await getActiveSearchId(
        searchSessionId
      );

    if (activeSearchId === searchId) {
      await redisClient.del(
        getActiveSearchKey(
          searchSessionId
        )
      );
    }
  }

  // Remove actual search data
  await redisClient.del(
    getMetaKey(searchId)
  );

  await redisClient.del(
    getResultsKey(searchId)
  );

  console.log(
    `🗑️ HOTEL SEARCH CANCELLED: ${searchId}`
  );
};

// =========================================================
// COMPLETE SEARCH
// =========================================================

export const completeHotelSearch = async (
  searchId,
  data = {}
) => {
  const meta =
    await getHotelSearchMeta(searchId);

  if (!meta) {
    return null;
  }

  const cancelled =
    await redisClient.get(
      getCancelledKey(searchId)
    );

  if (cancelled) {
    return null;
  }

  return updateHotelSearchMeta(
    searchId,
    {
      status: "completed",

      contentStatus:
        data.contentStatus ||
        "completed",

      rateStatus:
        data.rateStatus ||
        "completed",

      availableHotels:
        data.availableHotels ??
        0,
    }
  );
};

// =========================================================
// FAIL SEARCH
// =========================================================

export const failHotelSearch = async (
  searchId,
  error
) => {
  const meta =
    await getHotelSearchMeta(searchId);

  if (!meta) {
    return null;
  }

  const cancelled =
    await redisClient.get(
      getCancelledKey(searchId)
    );

  if (cancelled) {
    return null;
  }

  return updateHotelSearchMeta(
    searchId,
    {
      status: "failed",

      contentStatus: "failed",
      rateStatus: "failed",

      error:
        error?.message ||
        String(error) ||
        "Hotel search failed",
    }
  );
};