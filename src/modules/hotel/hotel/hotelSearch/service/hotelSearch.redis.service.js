import redisClient from "../../../../../config/redis.js";

const SEARCH_TTL = 60 * 60; // 1 hour

const getMetaKey = (searchId) =>
  `hotel-search:${searchId}:meta`;

const getResultsKey = (searchId) =>
  `hotel-search:${searchId}:results`;

const getUserActiveKey = (userId) =>
  `hotel-search:user:${userId}:active`;

/**
 * Create a new search state.
 */
export const createHotelSearchState = async ({
  searchId,
  userId,
  supplier = "AKBAR",
}) => {
  const now = new Date().toISOString();

  const meta = {
    searchId,
    userId: String(userId),
    supplier,

    status: "processing",

    contentStatus: "processing",
    rateStatus: "inprogress",

    totalContent: 0,
    contentReceived: 0,
    availableHotels: 0,

    error: null,

    createdAt: now,
    updatedAt: now,
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

  await redisClient.set(
    getUserActiveKey(userId),
    searchId,
    {
      EX: SEARCH_TTL,
    }
  );

  return meta;
};

/**
 * Get search meta.
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
 * Get user's active search.
 */
export const getUserActiveSearchId = async (userId) => {
  if (!userId) {
    return null;
  }

  return redisClient.get(
    getUserActiveKey(userId)
  );
};

/**
 * Delete complete search.
 */
export const deleteHotelSearch = async (searchId) => {
  const meta = await getHotelSearchMeta(searchId);

  await redisClient.del(
    getMetaKey(searchId),
    getResultsKey(searchId)
  );

  if (meta?.userId) {
    const activeSearchId =
      await getUserActiveSearchId(meta.userId);

    // Delete active pointer only if it still points
    // to this search.
    if (activeSearchId === searchId) {
      await redisClient.del(
        getUserActiveKey(meta.userId)
      );
    }
  }
};

/**
 * Cancel old search and remove its Redis data.
 */
export const cancelAndDeleteHotelSearch = async (
  searchId
) => {
  const meta = await getHotelSearchMeta(searchId);

  if (!meta) {
    return;
  }

  console.log(
    `🛑 CANCELING OLD HOTEL SEARCH: ${searchId}`
  );

  // Mark cancelled first so background job stops.
  await redisClient.set(
    getMetaKey(searchId),
    JSON.stringify({
      ...meta,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    }),
    {
      EX: 60,
    }
  );

  // Give currently running code a chance to see
  // cancelled state.
  await redisClient.del(
    getResultsKey(searchId)
  );

  const activeSearchId =
    await getUserActiveSearchId(meta.userId);

  if (activeSearchId === searchId) {
    await redisClient.del(
      getUserActiveKey(meta.userId)
    );
  }

  console.log(
    `🗑️ OLD HOTEL SEARCH REDIS DATA DELETED: ${searchId}`
  );
};

/**
 * Check whether search is still active.
 */
export const isHotelSearchActive = async (
  searchId
) => {
  const meta = await getHotelSearchMeta(searchId);

  return Boolean(
    meta &&
      meta.status === "processing"
  );
};

/**
 * Update search meta.
 */
export const updateHotelSearchMeta = async (
  searchId,
  updates
) => {
  const current =
    await getHotelSearchMeta(searchId);

  if (!current) {
    return null;
  }

  // Never allow cancelled/deleted search
  // to become active again.
  if (current.status === "cancelled") {
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

/**
 * Save progressive matched results.
 */
export const setHotelSearchResults = async (
  searchId,
  hotels
) => {
  const active =
    await isHotelSearchActive(searchId);

  if (!active) {
    console.log(
      `⛔ SEARCH ${searchId} IS NO LONGER ACTIVE. SKIPPING REDIS WRITE.`
    );

    return false;
  }

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

  return true;
};

/**
 * Get results.
 */
export const getHotelSearchResults = async (
  searchId
) => {
  const data =
    await redisClient.get(
      getResultsKey(searchId)
    );

  return data
    ? JSON.parse(data)
    : [];
};

/**
 * Paginated results.
 */
export const getHotelSearchResultsPaginated =
  async ({
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
      await getHotelSearchResults(
        searchId
      );

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

/**
 * Complete search.
 */
export const completeHotelSearch =
  async (
    searchId,
    data = {}
  ) => {
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
          data.availableHotels ?? 0,
      }
    );
  };

/**
 * Fail search.
 */
export const failHotelSearch = async (
  searchId,
  error
) => {
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