import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";

export const createAkbarHotelItineraryAPI = async ({
  payload,
  searchTracingKey,
}) => {
  const itineraryUrl =
    process.env.AKBAR_HOTEL_ITINERARY_URL ||
    (process.env.AKBAR_HOTEL_API_URL
      ? `${process.env.AKBAR_HOTEL_API_URL}/Hotel/CreateItinerary`
      : null);

  if (!itineraryUrl) {
    const error = new Error(
      "AKBAR_HOTEL_ITINERARY_URL or AKBAR_HOTEL_API_URL must be configured"
    );
    error.statusCode = 503;
    throw error;
  }

  const token = await getAKBARToken();
  const response = await axios.post(itineraryUrl, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(searchTracingKey
        ? { "search-tracing-key": searchTracingKey }
        : {}),
    },
    timeout: 60000,
  });

  return response.data;
};
