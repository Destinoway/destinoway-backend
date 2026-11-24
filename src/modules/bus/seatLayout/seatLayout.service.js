import { getAkbarSeatLayout } from "./adapters/akbar/api/seatLayout.api.js";
import { mapAkbarSeatLayout } from "./adapters/akbar/mappers/seatLayout.mapper.js";

export const getBusSeatLayoutService = async (params) =>
  mapAkbarSeatLayout(await getAkbarSeatLayout(params));
