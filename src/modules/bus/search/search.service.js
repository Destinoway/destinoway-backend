import { startAkbarBusSearch, getAkbarBusSearch } from "./adapters/akbar/api/search.api.js";
import { mapAkbarBusSearch } from "./adapters/akbar/mappers/search.mapper.js";
import { cacheCompletedBusSearch } from "./searchCache.js";

export const startBusSearchService = async (trip) => {
  const response = await startAkbarBusSearch(trip);
  return mapAkbarBusSearch(response);
};

export const getBusSearchService = async (tui) => {
  const response = await getAkbarBusSearch(tui);
  await cacheCompletedBusSearch(response);
  return mapAkbarBusSearch(response);
};
