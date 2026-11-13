import axios from "axios";
import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
import {
  logSupplierApiExchange,
} from "../../../utils/hotelObservability.js";

const getCancelBookingEndpoint = () => {
  const configuredUrl =
    process.env.AKBAR_HOTEL_ITINERARY_URL ||
    process.env.AKBAR_HOTEL_API_URL;

  if (!configuredUrl?.trim()) {
    const error = new Error(
      "AKBAR_HOTEL_ITINERARY_URL or AKBAR_HOTEL_API_URL must be configured"
    );
    error.statusCode = 503;
    error.supplierRequestSent = false;
    throw error;
  }

  try {
    const baseUrl = new URL(configuredUrl.trim());
    if (baseUrl.protocol !== "https:" || !baseUrl.hostname) {
      throw new Error("AKBAR hotel itinerary URL must use HTTPS");
    }
    return new URL("/Hotel/CancelHotelBooking", baseUrl.origin);
  } catch {
    const error = new Error("AKBAR hotel itinerary URL is invalid");
    error.statusCode = 503;
    error.supplierRequestSent = false;
    throw error;
  }
};

const unwrapSupplierResponse = (response) =>
  response && typeof response === "object"
    ? response.data ?? response
    : {};

export const cancelAkbarHotelBooking = async ({
  transactionId,
  tui,
  finYearId,
  remarks,
  bookingId,
  correlationId,
}) => {
  const endpoint = getCancelBookingEndpoint();
  const numericTransactionId = Number(transactionId);
  if (!Number.isSafeInteger(numericTransactionId) || numericTransactionId <= 0) {
    const error = new Error("AKBAR itinerary TransactionID is invalid");
    error.statusCode = 409;
    error.supplierRequestSent = false;
    throw error;
  }
  if (typeof tui !== "string" || !tui.trim()) {
    const error = new Error("AKBAR RetrieveBooking TUI is missing");
    error.statusCode = 409;
    error.supplierRequestSent = false;
    throw error;
  }
  if (finYearId === undefined || finYearId === null || !String(finYearId).trim()) {
    const error = new Error("AKBAR RetrieveBooking FinYearID is missing");
    error.statusCode = 409;
    error.supplierRequestSent = false;
    throw error;
  }

  let token;
  try {
    token = await getAKBARToken({
      operation: "cancel_booking",
      correlationId,
    });
  } catch (error) {
    error.supplierRequestSent = false;
    throw error;
  }
  const payload = {
    Remarks: remarks,
    TUI: tui,
    TransactionID: numericTransactionId,
    YearType: String(finYearId),
  };
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const response = await logSupplierApiExchange(
      {
        operation: "cancel_booking",
        correlationId,
        hotelLogKey: String(bookingId),
        method: "POST",
        endpoint: endpoint.toString(),
        headers,
        request: { body: payload },
      },
      () => axios.post(endpoint.toString(), payload, { headers, timeout: 60000 }),
    );
    return response.data;
  } catch (error) {
    error.supplierRequestSent = true;
    throw error;
  }
};

export const getAkbarCancelBookingResponseData = unwrapSupplierResponse;
