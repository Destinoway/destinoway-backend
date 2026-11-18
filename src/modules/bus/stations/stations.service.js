import redisClient from "../../../config/redis.js";
import { getBusStationsAPI } from "./adapters/akbar/api/stations.api.js";
import { mapAkbarStationsResponse } from "./adapters/akbar/mappers/stations.mapper.js";

// Station list changes rarely, so cache it for a day.
const CACHE_TTL_SECONDS = 24 * 60 * 60;

const cacheKey = (term) => `AKBAR:bus:stations:${term || "_all"}`;

const readCache = async (key) => {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("BUS STATIONS: Redis read failed:", error.message);
    return null;
  }
};

const writeCache = async (key, value) => {
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error("BUS STATIONS: Redis write failed:", error.message);
  }
};

/**
 * @param {{ term?: string, type?: "from" | "to" | "popular" }} params
 * @returns {{ stations: Array, source: "cache" | "supplier" }}
 */
export const getBusStationsService = async ({ term = "", type } = {}) => {
  const normalizedTerm = term.trim().toLowerCase();
  const key = cacheKey(normalizedTerm);

  let stations = await readCache(key);
  let source = "cache";

  if (!stations) {
    const response = await getBusStationsAPI({ term: normalizedTerm });
    stations = mapAkbarStationsResponse(response);
    source = "supplier";

    // Don't cache empty results, the supplier may have had a hiccup.
    if (stations.length) {
      await writeCache(key, stations);
    }
  }

  if (type) {
    stations = stations.filter((station) => station.type === type);
  }

  return { stations, source };
};
