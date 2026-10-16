import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
} from "../../../../utils/hotelObservability.js";

export const hotelRoomsAPI = async ({
  correlationId,
  supplierSearchId,
  hotelId,
  searchTracingKey,
}) => {
  const token = await getAKBARToken();

  const url =
    `${process.env.AKBAR_HOTEL_API_URL}` +
    `/api/hotels/search/result/${supplierSearchId}/${encodeURIComponent(hotelId)}/rooms`;

  const startedAt = performance.now();
  logHotelEvent("info", "hotel.supplier_request.started", {
    correlationId,
    supplier: "AKBAR",
    operation: "hotel_rooms",
    supplierSearchId,
    hotelId,
  });

  let response;
  try {
    response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(searchTracingKey
        ? { "search-tracing-key": searchTracingKey }
        : {}),
    },
    timeout: 60000,
    });
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_request.failed", {
      correlationId,
      supplier: "AKBAR",
      operation: "hotel_rooms",
      supplierSearchId,
      hotelId,
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
      ...getSupplierResponseSummary(error.response?.data),
    });
    throw error;
  }

  logHotelEvent("info", "hotel.supplier_request.completed", {
    correlationId,
    supplier: "AKBAR",
    operation: "hotel_rooms",
    supplierSearchId,
    hotelId,
    httpStatus: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    ...getSupplierResponseSummary(response.data),
  });
  return response.data;
};