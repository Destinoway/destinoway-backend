import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendSuccess } from "../../utils/response/ApiResponse.js";
import {
  getAutocompleteService,
  getPlaceDetailsService,
} from "./olaMaps.service.js";

export const getAutocomplete = asyncHandler(async (req, res) => {
  const data = await getAutocompleteService({
    input: req.query.input,
    location: req.query.location,
  });

  return sendSuccess(res, "Ola Maps suggestions fetched successfully", data);
});

export const getPlaceDetails = asyncHandler(async (req, res) => {
  const data = await getPlaceDetailsService({
    placeId: req.query.place_id,
  });

  return sendSuccess(res, "Ola Maps place details fetched successfully", data);
});
