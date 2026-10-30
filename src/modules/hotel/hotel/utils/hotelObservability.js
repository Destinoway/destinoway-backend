export const logHotelEvent = () => {};

// Keep the wrapper API for callers while running the operation without emitting logs.
export const traceHotelPaymentStep = ({ operation }) => operation();

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
