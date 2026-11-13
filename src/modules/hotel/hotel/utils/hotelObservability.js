import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const logHotelEvent = () => {};

// Keep the wrapper API for callers while running the operation without emitting logs.
export const traceHotelPaymentStep = ({ operation }) => operation();

const toPlainHeaders = (headers = {}) =>
  typeof headers?.toJSON === "function" ? headers.toJSON() : headers;

// Preserve the full supplier exchange while keeping reusable credentials and
// payment secrets out of persistent logs. Match common camelCase and
// underscore/hyphen variants (for example accessToken and search-tracing-key).
const SENSITIVE_LOG_FIELD =
  /(authorization|proxy.?authorization|cookie|password|secret|api.?key|browser.?key|auth.?header|credential|token|key|rmssignature|cvv|pan|gsttin)/i;

const redactSupplierLogValue = (value, fieldName = "") => {
  if (SENSITIVE_LOG_FIELD.test(fieldName)) {
    return value == null || value === ""
      ? { redacted: true, present: false }
      : { redacted: true, present: true };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSupplierLogValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        redactSupplierLogValue(child, key),
      ]),
    );
  }
  return value;
};

const redactSupplierLogHeaders = (headers) =>
  redactSupplierLogValue(toPlainHeaders(headers));

const writeSupplierApiLog = async (event) => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    source: "supplier_api",
    ...event,
  });
  // PM2 may truncate very large console lines. Keep the full exchange in JSONL.
  // Override the path in deployment if the application runs from another cwd.
  const logFile = path.resolve(
    process.env.AKBAR_API_LOG_FILE || "logs/akbar-api-exchanges.jsonl",
  );
  try {
    await mkdir(path.dirname(logFile), { recursive: true });
    await appendFile(logFile, `${line}\n`, { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    // Logging must not take down a supplier booking/search request.
    console.error("[supplier_api] could not append exchange log", error.message);
  }
  console.info(line);
};

// Retained as a no-op for existing imports; complete supplier responses are logged.
export const resetSupplierHotelLogLimit = () => {};

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
  await writeSupplierApiLog({
    event: "request",
    supplier,
    operation,
    correlationId: correlationId ?? null,
    hotelLogKey: hotelLogKey ?? null,
    method: String(method).toUpperCase(),
    endpoint,
    headers: redactSupplierLogHeaders(headers),
    request: redactSupplierLogValue(request),
  });

  try {
    const response = await execute();
    await writeSupplierApiLog({
      event: "response",
      supplier,
      operation,
      correlationId: correlationId ?? null,
      hotelLogKey: hotelLogKey ?? null,
      method: String(method).toUpperCase(),
      endpoint,
      status: response.status,
      headers: redactSupplierLogHeaders(response.headers),
      response: redactSupplierLogValue(response.data),
    });
    return response;
  } catch (error) {
    const errorResponse = error.response;
    await writeSupplierApiLog({
      event: "error",
      supplier,
      operation,
      correlationId: correlationId ?? null,
      hotelLogKey: hotelLogKey ?? null,
      method: String(method).toUpperCase(),
      endpoint,
      status: errorResponse?.status ?? null,
      headers: redactSupplierLogHeaders(errorResponse?.headers),
      response: redactSupplierLogValue(errorResponse?.data ?? null),
      error: error.message,
    });
    throw error;
  }
};

export const logSupplierCredentialContext = async ({
  operation,
  correlationId,
  credentials,
}) => {
  await writeSupplierApiLog({
    event: "credential_context",
    supplier: "AKBAR",
    operation,
    correlationId: correlationId ?? null,
    credentialSource: "MongoDB token cache",
    credentials: redactSupplierLogValue(credentials),
  });
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
