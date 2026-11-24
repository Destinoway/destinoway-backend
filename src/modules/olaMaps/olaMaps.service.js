import axios from "axios";
import { randomUUID } from "node:crypto";
import ApiError from "../../utils/response/ApiError.js";

const OLA_MAPS_API_URL = "https://api.olamaps.io/places/v1";
const REQUEST_TIMEOUT_MS = 10000;

const requestOlaMaps = async (endpoint, params) => {
  const apiKey = process.env.OLA_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(503, "Ola Maps is not configured");
  }

  try {
    const response = await axios.get(`${OLA_MAPS_API_URL}/${endpoint}`, {
      params: { ...params, api_key: apiKey },
      headers: { "X-Request-Id": randomUUID() },
      timeout: REQUEST_TIMEOUT_MS,
    });

    return response.data;
  } catch (error) {
    throw new ApiError(502, "Ola Maps request failed", {
      providerStatus: error.response?.status || null,
    });
  }
};

export const getAutocompleteService = ({ input, location }) =>
  requestOlaMaps("autocomplete", { input, ...(location ? { location } : {}) });

export const getPlaceDetailsService = ({ placeId }) =>
  requestOlaMaps("details", { place_id: placeId });
