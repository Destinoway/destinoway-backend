export const logHotelEvent = () => {};

// Keep the wrapper API for callers while running the operation without emitting logs.
export const traceHotelPaymentStep = ({ operation }) => operation();

const supplierHotelLogCounts = new Map();
const MAX_SUPPLIER_HOTEL_DETAILS = 10;
const secretLogKey =
  /authorization|access.?token|refresh.?token|password|api.?key|client.?secret|browser.?key|signature|secret|cookie/i;
const privateLogKey =
  /email|mobile|phone|first.?name|middle.?name|last.?name|^fname$|^mname$|^lname$|postal|^pin$|^pan$/i;

const toPlainHeaders = (headers = {}) =>
  typeof headers?.toJSON === "function" ? headers.toJSON() : headers;

const redactSupplierLogValue = (value, key = "", parentPath = "") => {
  const isGuestOrContact = /contact|guest|passenger|traveler|traveller/i.test(parentPath);
  if (
    secretLogKey.test(key) ||
    privateLogKey.test(key) ||
    (isGuestOrContact && /^(name|address|addr)$/i.test(key))
  ) return "[REDACTED]";
  if (key.toLowerCase() === "tui") return maskSupplierTracingKey(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactSupplierLogValue(item, "", `${parentPath}.${key}`));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactSupplierLogValue(childValue, childKey, `${parentPath}.${key}`),
      ]),
    );
  }
  if (typeof value === "string" && value.length > 4000) {
    return `${value.slice(0, 4000)}...[truncated]`;
  }
  return value;
};

const redactSupplierHeaders = (headers) => {
  const plainHeaders = toPlainHeaders(headers);
  const safeHeaders = {};
  for (const [name, value] of Object.entries(plainHeaders ?? {})) {
    const normalizedName = name.toLowerCase();
    safeHeaders[name] = normalizedName === "search-tracing-key"
      ? maskSupplierTracingKey(String(value ?? ""))
      : secretLogKey.test(name)
        ? "[REDACTED]"
        : value;
  }
  return safeHeaders;
};

const limitHotelDetailsForLog = (
  value,
  hotelLogKey,
  parentKey = "",
  counts = { included: 0, omitted: 0 },
  includeHotelDetails = true,
) => {
  if (Array.isArray(value)) {
    if (/^(hotels|hotellist)$/i.test(parentKey)) {
      if (!includeHotelDetails) {
        counts.omitted += value.length;
        return [];
      }
      let state = supplierHotelLogCounts.get(hotelLogKey);
      if (!state) {
        if (supplierHotelLogCounts.size >= 1000) {
          const oldestKey = supplierHotelLogCounts.keys().next().value;
          supplierHotelLogCounts.delete(oldestKey);
        }
        state = { hotelIds: new Set(), anonymousCount: 0 };
      }
      const included = [];
      for (const hotel of value) {
        const identity =
          hotel?.id ??
          hotel?.hotelId ??
          hotel?.supplierHotelId ??
          hotel?.supplierHotelID ??
          hotel?.HotelId ??
          hotel?.HotelID;
        const identityKey = identity == null ? null : String(identity);
        const alreadyLogged = identityKey && state.hotelIds.has(identityKey);
        if (alreadyLogged || state.hotelIds.size + state.anonymousCount < MAX_SUPPLIER_HOTEL_DETAILS) {
          included.push(hotel);
          counts.included += 1;
          if (identityKey) state.hotelIds.add(identityKey);
          else state.anonymousCount += 1;
        } else {
          counts.omitted += 1;
        }
      }
      supplierHotelLogCounts.set(hotelLogKey, state);
      return included.map((item) =>
        limitHotelDetailsForLog(item, hotelLogKey, "", counts, includeHotelDetails),
      );
    }
    return value.map((item) =>
      limitHotelDetailsForLog(item, hotelLogKey, "", counts, includeHotelDetails),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        limitHotelDetailsForLog(child, hotelLogKey, key, counts, includeHotelDetails),
      ]),
    );
  }
  return value;
};

const writeSupplierApiLog = (event) => {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    source: "supplier_api",
    ...event,
  }));
};

export const resetSupplierHotelLogLimit = (hotelLogKey) => {
  if (!hotelLogKey) return;
  supplierHotelLogCounts.delete(String(hotelLogKey));
};

export const logSupplierApiExchange = async ({
  supplier = "AKBAR",
  operation,
  correlationId,
  hotelLogKey,
  method,
  endpoint,
  headers = {},
  request = null,
}, execute) => {
  const logKey = String(hotelLogKey ?? correlationId ?? endpoint);
  writeSupplierApiLog({
    event: "request",
    supplier,
    operation,
    correlationId: correlationId ?? null,
    method: String(method).toUpperCase(),
    endpoint,
    headers: redactSupplierHeaders(headers),
    request: redactSupplierLogValue(request),
  });

  try {
    const response = await execute();
    const hotelCounts = { included: 0, omitted: 0 };
    const responseData = limitHotelDetailsForLog(
      redactSupplierLogValue(response.data),
      logKey,
      "",
      hotelCounts,
      [
        "hotel_search_content",
        "hotel_search_rate",
        "hotel_details_content",
        "hotel_details_rooms",
      ].includes(operation),
    );
    writeSupplierApiLog({
      event: "response",
      supplier,
      operation,
      correlationId: correlationId ?? null,
      method: String(method).toUpperCase(),
      endpoint,
      status: response.status,
      headers: redactSupplierHeaders(response.headers),
      response: responseData,
      ...(hotelCounts.included || hotelCounts.omitted
        ? {
            hotelDetailsIncludedInThisResponse: hotelCounts.included,
            hotelDetailsOmittedFromThisResponse: hotelCounts.omitted,
            maxUniqueHotelDetailsPerSearch: MAX_SUPPLIER_HOTEL_DETAILS,
          }
        : {}),
    });
    return response;
  } catch (error) {
    const errorResponse = error.response;
    const hotelCounts = { included: 0, omitted: 0 };
    const responseData = errorResponse
      ? limitHotelDetailsForLog(
          redactSupplierLogValue(errorResponse.data),
          logKey,
          "",
          hotelCounts,
          [
            "hotel_search_content",
            "hotel_search_rate",
            "hotel_details_content",
            "hotel_details_rooms",
          ].includes(operation),
        )
      : null;
    writeSupplierApiLog({
      event: "error",
      supplier,
      operation,
      correlationId: correlationId ?? null,
      method: String(method).toUpperCase(),
      endpoint,
      status: errorResponse?.status ?? null,
      headers: redactSupplierHeaders(errorResponse?.headers),
      response: responseData,
      error: error.message,
    });
    throw error;
  }
};

export const maskSupplierTracingKey = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value
    .split("|")
    .map((part) =>
      part.length > 8 ? `${part.slice(0, 4)}...${part.slice(-4)}` : "****"
    )
    .join("|");
};

export const getSupplierResponseSummary = (data) => {
  const response =
    data && typeof data === "object" ? data.data ?? data : {};
  const message = response.Msg ?? response.Message ?? response.message;

  return {
    supplierCode: response.Code ?? response.code ?? null,
    supplierMessage: Array.isArray(message)
      ? message
          .filter((item) => typeof item === "string")
          .join("; ")
          .slice(0, 300)
      : typeof message === "string"
        ? message.slice(0, 300)
        : null,
  };
};

export const getResponseShape = (data) => {
  if (data === null) {
    return { responseType: "null", responseKeys: [] };
  }

  if (Array.isArray(data)) {
    return { responseType: "array", responseKeys: [] };
  }

  if (typeof data !== "object") {
    return {
      responseType: typeof data,
      responseKeys: [],
    };
  }

  const nestedData = data.data;
  return {
    responseType: "object",
    responseKeys: Object.keys(data),
    nestedDataKeys:
      nestedData && typeof nestedData === "object"
        ? Object.keys(nestedData)
        : [],
  };
};
