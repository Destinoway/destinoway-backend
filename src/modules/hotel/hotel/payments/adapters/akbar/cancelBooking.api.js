import axios from "axios";
import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
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
  const logContext = {
    correlationId,
    bookingId: String(bookingId),
    supplier: "AKBAR",
    operation: "cancel_booking",
  };

  logHotelEvent("info", "hotel.supplier_request.started", {
    ...logContext,
    method: "POST",
    host: endpoint.host,
    path: endpoint.pathname,
    transactionId: numericTransactionId,
    requestBodyLogged: false,
  });

  const startedAt = performance.now();
  try {
    const response = await axios.post(endpoint.toString(), payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 60000,
    });
    const supplierData = unwrapSupplierResponse(response.data);
    logHotelEvent("info", "hotel.supplier_request.completed", {
      ...logContext,
      host: endpoint.host,
      path: endpoint.pathname,
      httpStatus: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      ...getSupplierResponseSummary(supplierData),
      responseKeys:
        supplierData && typeof supplierData === "object"
          ? Object.keys(supplierData)
          : [],
    });
    return response.data;
  } catch (error) {
    error.supplierRequestSent = true;
    logHotelEvent("error", "hotel.supplier_request.failed", {
      ...logContext,
      host: endpoint.host,
      path: endpoint.pathname,
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      errorName: error.name,
      errorCode: error.code ?? null,
      errorMessage: error.message,
      responseReceived: Boolean(error.response),
      ...getSupplierResponseSummary(error.response?.data),
    });
    throw error;
  }
};

export const getAkbarCancelBookingResponseData = unwrapSupplierResponse;
