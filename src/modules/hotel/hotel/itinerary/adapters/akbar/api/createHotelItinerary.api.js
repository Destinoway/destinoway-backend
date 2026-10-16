import axios from "axios";
import { getAKBARToken } from "../../../../../supplier/akbar/akbarAuth.service.js";

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

export const createAkbarHotelItineraryAPI = async ({
  payload,
  searchTracingKey,
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
  console.info("[AKBAR itinerary] Request endpoint:", {
    host: itineraryEndpoint.host,
    path: itineraryEndpoint.pathname,
  });

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

  console.info(
    "[AKBAR itinerary] Supplier response summary:",
    summarizeItineraryResponse(response),
  );

  return response.data;
};
