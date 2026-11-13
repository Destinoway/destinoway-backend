import { searchAKBARDestinationAPI } from "./adapters/akbar/akbarDestination.api.js";

import {
  mapAkbarDestinationResponse,
} from "./adapters/akbar/akbarDestination.mapper.js";

export const searchDestinationService = async (searchInput, { correlationId } = {}) => {
  const response = await searchAKBARDestinationAPI(searchInput, { correlationId });

  return mapAkbarDestinationResponse(response);
};
