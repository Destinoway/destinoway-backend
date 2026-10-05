import { searchAKBARDestinationAPI } from "./adapters/akbar/akbarDestination.api.js";

import {
  mapAkbarDestinationResponse,
} from "./adapters/akbar/akbarDestination.mapper.js";

export const searchDestinationService = async (searchInput) => {
  const response = await searchAKBARDestinationAPI(searchInput);

  return mapAkbarDestinationResponse(response);
};