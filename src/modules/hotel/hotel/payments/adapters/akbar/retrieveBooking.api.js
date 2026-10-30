import axios from "axios";
import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
import { logSupplierApiExchange } from "../../../utils/hotelObservability.js";

const getRetrieveBookingEndpoint = () => {
  const configuredUrl = process.env.START_PAY_URL;

  if (!configuredUrl?.trim()) {
    const error = new Error("START_PAY_URL is not configured");
    error.statusCode = 503;
    throw error;
  }

  let endpoint;
  try {
    const startPayUrl = new URL(configuredUrl.trim());
    if (startPayUrl.protocol !== "https:" || !startPayUrl.hostname) {
      throw new Error("START_PAY_URL must use HTTPS");
    }
    endpoint = new URL("/Utils/RetrieveBooking", startPayUrl.origin);
  } catch {
    const error = new Error("START_PAY_URL is invalid");
    error.statusCode = 503;
    throw error;
  }

  return endpoint;
};

const unwrapSupplierResponse = (response) =>
  response && typeof response === "object"
    ? response.data ?? response
    : {};

export const retrieveAkbarHotelBooking = async ({
  transactionId,
  bookingId,
  correlationId,
}) => {
  const endpoint = getRetrieveBookingEndpoint();
  const clientId = process.env.AKBAR_CLIENT_ID;

  if (!clientId) {
    const error = new Error("AKBAR_CLIENT_ID is not configured");
    error.statusCode = 503;
    throw error;
  }

  const referenceNumber = String(transactionId ?? "").trim();
  if (!referenceNumber) {
    const error = new Error("AKBAR itinerary TransactionID is missing");
    error.statusCode = 409;
    throw error;
  }

  const token = await getAKBARToken({
    operation: "retrieve_booking",
    correlationId,
  });
  const payload = {
    TUI: null,
    ReferenceType: "T",
    ReferenceNumber: referenceNumber,
    ServiceType: null,
    ClientID: clientId,
    RequestMode: "RB",
    Contact: null,
    Name: null,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const response = await logSupplierApiExchange(
    {
      operation: "retrieve_booking",
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
};

export const getAkbarRetrievedBookingFields = (response) => {
  const root = unwrapSupplierResponse(response);
  const fields = {
    tui: ["TUI"],
    finYearId: ["FinYearID"],
    crsPnr: ["CRSPNR", "CRSPnr", "CRS_PNR"],
    bookingStatus: ["BookStatus", "BookingStatus", "CurrentStatus"],
    bookingConfirmationId: ["BookingConfirmationId"],
    confirmationNumber: [
      "HotelConfirmationNumber",
      "ConfirmationNumber",
      "ConfirmationNo",
    ],
    voucherNumber: ["VoucherNumber", "VoucherNo"],
  };
  const found = {};
  const pending = [root];
  const seen = new Set();

  while (pending.length > 0 && Object.keys(found).length < Object.keys(fields).length) {
    const value = pending.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);

    for (const [field, aliases] of Object.entries(fields)) {
      if (found[field] !== undefined) continue;
      const match = Object.entries(value).find(([key, item]) =>
        aliases.some(
          (alias) =>
            alias.toLowerCase() === key.toLowerCase() &&
            (typeof item === "string" || typeof item === "number")
        )
      );
      if (match) found[field] = String(match[1]).trim();
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") pending.push(child);
    }
  }

  return found;
};
