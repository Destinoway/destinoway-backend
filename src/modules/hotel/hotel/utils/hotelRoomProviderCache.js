import redisClient from "../../../../config/redis.js";

const ROOM_PROVIDER_TTL = 60 * 60;

const getRoomProviderKey = (searchId, hotelId) =>
  `hotel-search:${searchId}:hotel:${hotelId}:room-providers`;
const getRoomRecommendationMetaKey = (searchId, hotelId) =>
  `hotel-search:${searchId}:hotel:${hotelId}:room-recommendation-meta`;

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

const getRoomRecommendationMeta = (data) => {
  const recommendations = unwrapRooms(data)?.recommendations;
  if (!Array.isArray(recommendations)) return {};

  return Object.fromEntries(
    recommendations
      .filter(
        (recommendation) =>
          typeof recommendation?.id === "string" &&
          typeof recommendation?.isPANRequired === "boolean",
      )
      .map((recommendation) => [
        recommendation.id,
        { isPANRequired: recommendation.isPANRequired },
      ]),
  );
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

  const metaKey = getRoomRecommendationMetaKey(searchId, hotelId);
  const existingMeta = await redisClient.get(metaKey);
  const metadata = {
    ...(existingMeta ? JSON.parse(existingMeta) : {}),
    ...getRoomRecommendationMeta(rooms),
  };
  await redisClient.set(metaKey, JSON.stringify(metadata), {
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

export const getCachedHotelRoomRecommendationMeta = async ({
  searchId,
  hotelId,
  recommendationId,
}) => {
  const data = await redisClient.get(
    getRoomRecommendationMetaKey(searchId, hotelId),
  );
  if (!data) return null;

  const metadata = JSON.parse(data);
  return metadata[recommendationId] ?? null;
};
