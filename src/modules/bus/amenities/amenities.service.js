import { getAkbarBusAmenities } from "./adapters/akbar/api/amenities.api.js";
import { mapAkbarBusAmenities } from "./adapters/akbar/mappers/amenities.mapper.js";

export const getBusAmenitiesService = async (params) =>
  mapAkbarBusAmenities(await getAkbarBusAmenities(params));
