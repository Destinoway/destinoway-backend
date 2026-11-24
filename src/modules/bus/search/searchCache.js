import redisClient from "../../../config/redis.js";

const TTL_SECONDS = 15 * 60;
const keyFor = (tui) => `AKBAR:bus:search:${tui}`;

export const cacheCompletedBusSearch = async (response) => {
  if (String(response?.completed).toLowerCase() !== "true" || !Array.isArray(response?.trips) || !response?.tui) return;
  try {
    await redisClient.set(keyFor(response.tui), JSON.stringify(response), { EX: TTL_SECONDS });
  } catch (error) {
    console.warn("BUS SEARCH: cache write failed", error.message);
  }
};

export const getCachedBusSearch = async (tui) => {
  try {
    const value = await redisClient.get(keyFor(tui));
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("BUS SEARCH: cache read failed", error.message);
    return null;
  }
};
