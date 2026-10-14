import redisClient from "../../../../config/redis.js";

const ROOM_PROVIDER_TTL = 60 * 60;

const getRoomProviderKey = (searchId, hotelId) =>
  `hotel-search:${searchId}:hotel:${hotelId}:room-providers`;

const unwrapRooms = (data) =>
  data?.rooms ?? data?.data?.rooms ?? data?.data ?? data;

const getRoomProviderMap = (data) => {
  const recommendations = unwrapRooms(data)?.recommendations;

  if (!Array.isArray(recommendations)) {
    return {};
  }

  const providers = {};

  for (const recommendation of recommendations) {
    const roomGroups = Array.isArray(recommendation?.roomGroup)
      ? recommendation.roomGroup
      : [];

    for (const group of roomGroups) {
      if (
        typeof group?.id === "string" &&
        typeof group?.providerName === "string" &&
        group.providerName.trim()
      ) {
        providers[group.id] = group.providerName;
      }
    }

    const recommendationProviders = [
      ...new Set(
        roomGroups
          .map((group) => group?.providerName)
          .filter(
            (providerName) =>
              typeof providerName === "string" && providerName.trim()
          )
      ),
    ];

    if (
      typeof recommendation?.id === "string" &&
      recommendationProviders.length === 1
    ) {
      providers[recommendation.id] = recommendationProviders[0];
    }
  }

  return providers;
};

export const cacheHotelRoomProviders = async ({
  searchId,
  hotelId,
  rooms,
}) => {
  const key = getRoomProviderKey(searchId, hotelId);
  const existing = await redisClient.get(key);
  const providers = {
    ...(existing ? JSON.parse(existing) : {}),
    ...getRoomProviderMap(rooms),
  };

  await redisClient.set(key, JSON.stringify(providers), {
    EX: ROOM_PROVIDER_TTL,
  });
};

export const getCachedHotelRoomProvider = async ({
  searchId,
  hotelId,
  recommendationId,
}) => {
  const data = await redisClient.get(getRoomProviderKey(searchId, hotelId));

  if (!data) {
    return null;
  }

  const providers = JSON.parse(data);
  return providers[recommendationId] ?? null;
};
