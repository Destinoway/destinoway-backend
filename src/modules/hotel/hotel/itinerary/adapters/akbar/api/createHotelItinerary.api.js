import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";
import {
  logSupplierApiExchange,
  maskSupplierTracingKey,
} from "../../../../utils/hotelObservability.js";

const summarizeItineraryResponse = (response) => {
  const responseData = response.data;
  const supplierData =
    responseData && typeof responseData === "object"
      ? responseData.data ?? responseData
      : {};
  const message =
    supplierData.Msg ?? supplierData.Message ?? supplierData.message;
  const priceInfo = supplierData.priceInfo ?? supplierData.PriceInfo;
  const tui = supplierData.TUI ?? supplierData.Tui;
  const contentType = response.headers["content-type"];
  const bodyType = Buffer.isBuffer(responseData)
    ? "buffer"
    : responseData === null
      ? "null"
      : Array.isArray(responseData)
        ? "array"
        : typeof responseData;
  const summary = {
    httpStatus: response.status,
    contentType,
    bodyType,
    supplierCode: supplierData.Code ?? supplierData.code,
    transactionId:
      supplierData.TransactionID ??
      supplierData.TransactionId ??
      supplierData.transactionID ??
      supplierData.transactionId,
    netAmount: supplierData.NetAmount ?? supplierData.netAmount,
    message: Array.isArray(message)
      ? message.filter((item) => typeof item === "string").join("; ").slice(0, 300)
      : typeof message === "string"
        ? message.slice(0, 300)
        : undefined,
    priceInfo:
      priceInfo && typeof priceInfo === "object"
        ? {
            priceCode: priceInfo.Pricecode ?? priceInfo.PriceCode,
            priceMessage: priceInfo.Pricemessage ?? priceInfo.PriceMessage,
            priceType: priceInfo.Pricetype ?? priceInfo.PriceType,
          }
        : undefined,
    tui:
      typeof tui === "string" && tui.length > 16
        ? `${tui.slice(0, 8)}...${tui.slice(-4)}`
        : undefined,
    bodyLength:
      typeof responseData === "string" || Buffer.isBuffer(responseData)
        ? responseData.length
        : undefined,
    topLevelKeys:
      responseData && typeof responseData === "object"
        ? Object.keys(responseData)
        : [],
    transactionIdFields: [],
    statusFields: [],
  };
  const pending = [{ value: responseData, path: "", depth: 0 }];

  while (pending.length > 0) {
    const { value, path, depth } = pending.pop();
    if (!value || typeof value !== "object" || depth >= 6) continue;

    for (const [key, child] of Object.entries(value)) {
      const fieldPath = path ? `${path}.${key}` : key;
      if (/^transaction.?id$/i.test(key)) {
        summary.transactionIdFields.push(fieldPath);
      }
      if (/^(status|statuscode|code|errorcode|resultcode)$/i.test(key)) {
        summary.statusFields.push(fieldPath);
      }
      if (child && typeof child === "object") {
        pending.push({ value: child, path: fieldPath, depth: depth + 1 });
      }
    }
  }

  return summary;
};

const redactItineraryPayload = (payload) => ({
  ...payload,
  TUI: maskSupplierTracingKey(payload.TUI),
  ClientID: payload.ClientID ? "[REDACTED]" : payload.ClientID,
  DeviceID: payload.DeviceID ? "[REDACTED]" : payload.DeviceID,
  ContactInfo: payload.ContactInfo
    ? {
        ...payload.ContactInfo,
        Title: "[REDACTED]",
        FName: "[REDACTED]",
        LName: "[REDACTED]",
        Mobile: "[REDACTED]",
        Email: "[REDACTED]",
        Address: "[REDACTED]",
        State: "[REDACTED]",
        City: "[REDACTED]",
        PIN: "[REDACTED]",
        GSTCompanyName: "[REDACTED]",
        GSTTIN: "[REDACTED]",
        GSTMobile: "[REDACTED]",
        GSTEmail: "[REDACTED]",
      }
    : payload.ContactInfo,
  Rooms: Array.isArray(payload.Rooms)
    ? payload.Rooms.map((room) => ({
        ...room,
        Guests: Array.isArray(room.Guests)
          ? room.Guests.map((guest) => ({
              ...guest,
              GuestID: "[REDACTED]",
              FirstName: "[REDACTED]",
              MiddleName: guest.MiddleName ? "[REDACTED]" : guest.MiddleName,
              LastName: "[REDACTED]",
              MobileNo: guest.MobileNo ? "[REDACTED]" : guest.MobileNo,
              Email: guest.Email ? "[REDACTED]" : guest.Email,
              Pan: guest.Pan ? "[REDACTED]" : guest.Pan,
            }))
          : room.Guests,
      }))
    : payload.Rooms,
});

export const createAkbarHotelItineraryAPI = async ({
  payload,
  searchTracingKey,
  correlationId,
}) => {
  const configuredItineraryUrl =
    process.env.AKBAR_HOTEL_ITINERARY_URL ||
    process.env.AKBAR_HOTEL_API_URL;

  if (!configuredItineraryUrl) {
    const error = new Error(
      "AKBAR_HOTEL_ITINERARY_URL or AKBAR_HOTEL_API_URL must be configured"
    );
    error.statusCode = 503;
    throw error;
  }

  const itineraryEndpoint = new URL(configuredItineraryUrl);
  if (!/\/Hotel\/CreateItinerary\/?$/i.test(itineraryEndpoint.pathname)) {
    itineraryEndpoint.pathname =
      `${itineraryEndpoint.pathname.replace(/\/+$/, "")}/Hotel/CreateItinerary`;
  }
  itineraryEndpoint.pathname = itineraryEndpoint.pathname.replace(/\/+$/, "");

  const itineraryUrl = itineraryEndpoint.toString();

  const token = await getAKBARToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(searchTracingKey
      ? { "search-tracing-key": searchTracingKey }
      : {}),
  };
  try {
    const response = await logSupplierApiExchange(
      {
        operation: "create_itinerary",
        correlationId,
        method: "POST",
        endpoint: itineraryUrl,
        headers,
        request: { body: payload },
      },
      () => axios.post(itineraryUrl, payload, { headers, timeout: 60000 }),
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
