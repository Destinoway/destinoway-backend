// import axios from "axios";
// import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
// import {
//   getSupplierResponseSummary,
//   logHotelEvent,
//   maskSupplierTracingKey,
// } from "../../../utils/hotelObservability.js";

// const getBookingBaseUrl = () => {
//   const configuredUrl = process.env.START_PAY_URL;
//   if (!configuredUrl) {
//     logHotelEvent("error", "hotel.supplier_config.invalid", {
//       supplier: "AKBAR",
//       operation: "start_payment",
//       variable: "START_PAY_URL",
//       configured: false,
//       reason: "missing",
//     });
//     const error = new Error(
//       "START_PAY_URL must be configured with the AKBAR StartPay base URL"
//     );
//     error.statusCode = 503;
//     error.supplierRequestSent = false;
//     throw error;
//   }

//   try {
//     const normalizedUrl = configuredUrl.trim();
//     const parsedUrl = new URL(normalizedUrl);
//     if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname) {
//       throw new Error("START_PAY_URL must be a valid HTTPS URL");
//     }

//     logHotelEvent("info", "hotel.supplier_config.validated", {
//       supplier: "AKBAR",
//       operation: "start_payment",
//       variable: "START_PAY_URL",
//       configured: true,
//       protocol: parsedUrl.protocol,
//       host: parsedUrl.host,
//       path: parsedUrl.pathname,
//       trimmedWhitespace: configuredUrl !== normalizedUrl,
//       hasQuery: Boolean(parsedUrl.search),
//       hasFragment: Boolean(parsedUrl.hash),
//     });
//     return parsedUrl.origin;
//   } catch (error) {
//     logHotelEvent("error", "hotel.supplier_config.invalid", {
//       supplier: "AKBAR",
//       operation: "start_payment",
//       variable: "START_PAY_URL",
//       configured: true,
//       valueLength: configuredUrl.length,
//       hasSurroundingQuotes:
//         (configuredUrl.startsWith('"') && configuredUrl.endsWith('"')) ||
//         (configuredUrl.startsWith("'") && configuredUrl.endsWith("'")),
//       containsWhitespace: /\s/.test(configuredUrl),
//       errorName: error.name,
//       errorMessage: error.message,
//     });
//     error.supplierRequestSent = false;
//     throw error;
//   }
// };

// const unwrapSupplierResponse = (response) =>
//   response && typeof response === "object" ? response.data ?? response : {};

// export const startAkbarHotelPay = async ({
//   booking,
//   correlationId,
// }) => {
//   const browserKey = process.env.AKBAR_BROWSER_KEY;
//   const agentInfo = process.env.AKBAR_AGENT_INFO;
//   const clientId = process.env.AKBAR_CLIENT_ID;
//   const merchantId = Number(process.env.AKBAR_MERCHANT_ID);

//   if (
//     !browserKey ||
//     !agentInfo ||
//     !clientId ||
//     !process.env.AKBAR_MERCHANT_ID ||
//     !Number.isSafeInteger(merchantId) ||
//     merchantId < 0
//   ) {
//     const error = new Error(
//       "AKBAR_BROWSER_KEY, AKBAR_AGENT_INFO, AKBAR_CLIENT_ID and AKBAR_MERCHANT_ID must be configured for StartPay"
//     );
//     error.statusCode = 503;
//     error.supplierRequestSent = false;
//     throw error;
//   }

//   const itineraryResponse =
//     booking.itineraryResponse?.data ?? booking.itineraryResponse ?? {};
//   const tui = itineraryResponse.TUI ?? itineraryResponse.Tui;
//   const transactionId = Number(booking.transactionId);
//   const netAmount = Number(
//     itineraryResponse.NetAmount ??
//       itineraryResponse.netAmount ??
//       booking.price?.total
//   );
//   if (typeof tui !== "string" || !tui.trim()) {
//     const error = new Error("AKBAR itinerary TUI is missing for StartPay");
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }
//   if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
//     const error = new Error("AKBAR itinerary TransactionID is invalid for StartPay");
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }
//   if (!Number.isFinite(netAmount) || netAmount <= 0) {
//     const error = new Error("AKBAR itinerary NetAmount is invalid for StartPay");
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }

//   let endpoint;
//   try {
//     endpoint = new URL("/Payment/StartPay", getBookingBaseUrl());
//   } catch (error) {
//     error.supplierRequestSent = false;
//     logHotelEvent("error", "hotel.supplier_config.endpoint_build_failed", {
//       correlationId,
//       bookingId: String(booking._id),
//       supplier: "AKBAR",
//       operation: "start_payment",
//       variable: "START_PAY_URL",
//       errorName: error.name,
//       errorMessage: error.message,
//     });
//     throw error;
//   }
//   let token;
//   try {
//     token = await getAKBARToken({
//       operation: "start_payment",
//       correlationId,
//     });
//   } catch (error) {
//     error.supplierRequestSent = false;
//     throw error;
//   }
//   if (typeof token !== "string" || !token.trim()) {
//     const error = new Error("AKBAR token is empty; StartPay request was not sent");
//     error.statusCode = 503;
//     error.supplierRequestSent = false;
//     logHotelEvent("error", "hotel.supplier_token.unavailable", {
//       correlationId,
//       bookingId: String(booking._id),
//       supplier: "AKBAR",
//       operation: "start_payment",
//       tokenPresent: false,
//     });
//     throw error;
//   }
//   logHotelEvent("info", "hotel.supplier_token.resolved", {
//     correlationId,
//     bookingId: String(booking._id),
//     supplier: "AKBAR",
//     operation: "start_payment",
//     tokenPresent: true,
//   });
//   const payload = {
//     SID: itineraryResponse.SID ?? null,
//     TUI: tui,
//     ClientID: clientId,
//     Email: booking.contactInfo.email,
//     Promo: null,
//     TransactionID: transactionId,
//     PaymentType: "",
//     BankCode: "",
//     GateWayCode: "",
//     MerchantID: merchantId,
//     PaymentAmount: netAmount,
//     PaymentCharge: 0,
//     Card: {
//       Number: "",
//       Expiry: "",
//       CVV: "",
//       CHName: "",
//       FName: null,
//       LName: null,
//       Address: "",
//       City: "",
//       State: "",
//       Country: "",
//       PIN: "",
//       International: false,
//       SaveCard: false,
//       EMIMonths: "0",
//       Token: null,
//       NumberAlias: null,
//     },
//     VPA: "",
//     CardAlias: "",
//     QuickPay: null,
//     RMSSignature: "",
//     TargetCurrency: "",
//     TargetAmount: 0,
//     ThirdPartyInfo: null,
//     Hold: false,
//     TripType: null,
//     Authorization: `Bearer ${token}`,
//     QTransactionID: itineraryResponse.QTransactionID ?? 0,
//     NetAmount: netAmount,
//     OnlinePayment: false,
//     DepositPayment: true,
//     ReleaseDate: "/Date(-62135596800000)/",
//     BrowserKey: browserKey,
//     BrowserKeyFromToken: browserKey,
//     AgentInfo: agentInfo,
//   };

//   const startedAt = performance.now();
//   logHotelEvent("info", "hotel.supplier_request.started", {
//     correlationId,
//     bookingId: String(booking._id),
//     supplier: "AKBAR",
//     operation: "start_payment",
//     host: endpoint.host,
//     path: endpoint.pathname,
//     amount: netAmount,
//     currency: booking.price?.currency ?? null,
//     tui: maskSupplierTracingKey(tui),
//   });

//   try {
//     const response = await axios.post(endpoint.toString(), payload, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       timeout: 60000,
//     });
//     const supplierData = unwrapSupplierResponse(response.data);
//     logHotelEvent("info", "hotel.supplier_request.completed", {
//       correlationId,
//       bookingId: String(booking._id),
//       supplier: "AKBAR",
//       operation: "start_payment",
//       durationMs: Math.round(performance.now() - startedAt),
//       httpStatus: response.status,
//       ...getSupplierResponseSummary(response.data),
//       bookStatus: supplierData.BookStatus ?? null,
//       hasCrsPnr: Boolean(supplierData.CRSPNR),
//       tui: maskSupplierTracingKey(supplierData.TUI ?? tui),
//     });
//     return response.data;
//   } catch (error) {
//     error.supplierRequestSent = true;
//     error.supplierDefinitiveFailure =
//       error.response?.status >= 400 && error.response.status < 500;
//     logHotelEvent("error", "hotel.supplier_request.failed", {
//       correlationId,
//       bookingId: String(booking._id),
//       supplier: "AKBAR",
//       operation: "start_payment",
//       httpStatus: error.response?.status ?? null,
//       durationMs: Math.round(performance.now() - startedAt),
//       errorCode: error.code ?? null,
//       errorMessage: error.message,
//       ...getSupplierResponseSummary(error.response?.data),
//     });
//     throw error;
//   }
// };

// export const getAkbarStartPayResponseData = unwrapSupplierResponse;



import axios from "axios";
import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
  maskSupplierTracingKey,
} from "../../../utils/hotelObservability.js";

const getBookingBaseUrl = () => {
  const configuredUrl = process.env.START_PAY_URL;

  if (!configuredUrl) {
    logHotelEvent("error", "hotel.supplier_config.invalid", {
      supplier: "AKBAR",
      operation: "start_payment",
      variable: "START_PAY_URL",
      configured: false,
      reason: "missing",
    });

    const error = new Error(
      "START_PAY_URL must be configured with the AKBAR StartPay base URL"
    );
    error.statusCode = 503;
    error.supplierRequestSent = false;
    throw error;
  }

  try {
    const normalizedUrl = configuredUrl.trim();
    const parsedUrl = new URL(normalizedUrl);

    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname) {
      throw new Error("START_PAY_URL must be a valid HTTPS URL");
    }

    logHotelEvent("info", "hotel.supplier_config.validated", {
      supplier: "AKBAR",
      operation: "start_payment",
      variable: "START_PAY_URL",
      configured: true,
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      path: parsedUrl.pathname,
      trimmedWhitespace: configuredUrl !== normalizedUrl,
      hasQuery: Boolean(parsedUrl.search),
      hasFragment: Boolean(parsedUrl.hash),
    });

    return parsedUrl.origin;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_config.invalid", {
      supplier: "AKBAR",
      operation: "start_payment",
      variable: "START_PAY_URL",
      configured: true,
      valueLength: configuredUrl.length,
      hasSurroundingQuotes:
        (configuredUrl.startsWith('"') && configuredUrl.endsWith('"')) ||
        (configuredUrl.startsWith("'") && configuredUrl.endsWith("'")),
      containsWhitespace: /\s/.test(configuredUrl),
      errorName: error.name,
      errorMessage: error.message,
    });

    error.supplierRequestSent = false;
    throw error;
  }
};

const unwrapSupplierResponse = (response) =>
  response && typeof response === "object"
    ? response.data ?? response
    : {};

export const startAkbarHotelPay = async ({
  booking,
  correlationId,
}) => {
  const flowStartedAt = performance.now();

  logHotelEvent("info", "hotel.startpay.flow_started", {
    correlationId,
    bookingId: String(booking?._id ?? ""),
    supplier: "AKBAR",
    operation: "start_payment",
    processId: process.pid,
    bookingPresent: Boolean(booking),
    itineraryResponsePresent: Boolean(booking?.itineraryResponse),
    contactInfoPresent: Boolean(booking?.contactInfo),
    emailPresent: Boolean(booking?.contactInfo?.email),
  });

  const browserKey = process.env.AKBAR_BROWSER_KEY;
  const agentInfo = process.env.AKBAR_AGENT_INFO;
  const clientId = process.env.AKBAR_CLIENT_ID;
  const merchantId = Number(process.env.AKBAR_MERCHANT_ID);

  logHotelEvent("info", "hotel.startpay.config_check", {
    correlationId,
    bookingId: String(booking?._id ?? ""),
    supplier: "AKBAR",
    operation: "start_payment",
    browserKeyPresent: Boolean(browserKey),
    agentInfoPresent: Boolean(agentInfo),
    clientIdPresent: Boolean(clientId),
    merchantIdPresent: Boolean(process.env.AKBAR_MERCHANT_ID),
    merchantIdValid:
      Number.isSafeInteger(merchantId) && merchantId >= 0,
  });

  if (
    !browserKey ||
    !agentInfo ||
    !clientId ||
    !process.env.AKBAR_MERCHANT_ID ||
    !Number.isSafeInteger(merchantId) ||
    merchantId < 0
  ) {
    const error = new Error(
      "AKBAR_BROWSER_KEY, AKBAR_AGENT_INFO, AKBAR_CLIENT_ID and AKBAR_MERCHANT_ID must be configured for StartPay"
    );

    error.statusCode = 503;
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.startpay.config_invalid", {
      correlationId,
      bookingId: String(booking?._id ?? ""),
      supplier: "AKBAR",
      operation: "start_payment",
      browserKeyPresent: Boolean(browserKey),
      agentInfoPresent: Boolean(agentInfo),
      clientIdPresent: Boolean(clientId),
      merchantIdPresent: Boolean(process.env.AKBAR_MERCHANT_ID),
      merchantIdValid:
        Number.isSafeInteger(merchantId) && merchantId >= 0,
    });

    throw error;
  }

  const itineraryResponse =
    booking.itineraryResponse?.data ?? booking.itineraryResponse ?? {};

  const tui = itineraryResponse.TUI ?? itineraryResponse.Tui;
  const transactionId = Number(booking.transactionId);

  const netAmount = Number(
    itineraryResponse.NetAmount ??
      itineraryResponse.netAmount ??
      booking.price?.total
  );

  logHotelEvent("info", "hotel.startpay.itinerary_check", {
    correlationId,
    bookingId: String(booking?._id ?? ""),
    supplier: "AKBAR",
    operation: "start_payment",
    tuiPresent: typeof tui === "string" && Boolean(tui.trim()),
    transactionIdValid:
      Number.isSafeInteger(transactionId) && transactionId > 0,
    netAmountValid: Number.isFinite(netAmount) && netAmount > 0,
    netAmount,
    currency: booking.price?.currency ?? null,
    sidPresent:
      itineraryResponse.SID !== undefined &&
      itineraryResponse.SID !== null,
    qTransactionIdPresent:
      itineraryResponse.QTransactionID !== undefined &&
      itineraryResponse.QTransactionID !== null,
  });

  if (typeof tui !== "string" || !tui.trim()) {
    const error = new Error("AKBAR itinerary TUI is missing for StartPay");
    error.statusCode = 409;
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.startpay.validation_failed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      reason: "missing_tui",
      supplierRequestSent: false,
    });

    throw error;
  }

  if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
    const error = new Error(
      "AKBAR itinerary TransactionID is invalid for StartPay"
    );

    error.statusCode = 409;
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.startpay.validation_failed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      reason: "invalid_transaction_id",
      supplierRequestSent: false,
    });

    throw error;
  }

  if (!Number.isFinite(netAmount) || netAmount <= 0) {
    const error = new Error(
      "AKBAR itinerary NetAmount is invalid for StartPay"
    );

    error.statusCode = 409;
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.startpay.validation_failed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      reason: "invalid_net_amount",
      supplierRequestSent: false,
    });

    throw error;
  }

  let endpoint;

  try {
    endpoint = new URL("/Payment/StartPay", getBookingBaseUrl());

    logHotelEvent("info", "hotel.startpay.endpoint_resolved", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      host: endpoint.host,
      pathname: endpoint.pathname,
      protocol: endpoint.protocol,
      isHttps: endpoint.protocol === "https:",
    });
  } catch (error) {
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.supplier_config.endpoint_build_failed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      variable: "START_PAY_URL",
      errorName: error.name,
      errorMessage: error.message,
      supplierRequestSent: false,
    });

    throw error;
  }

  let token;
  const tokenStartedAt = performance.now();

  logHotelEvent("info", "hotel.startpay.token_request_started", {
    correlationId,
    bookingId: String(booking._id),
    supplier: "AKBAR",
    operation: "start_payment",
    processId: process.pid,
    requestedOperation: "start_payment",
  });

  try {
    token = await getAKBARToken({
      operation: "start_payment",
      correlationId,
    });

    logHotelEvent("info", "hotel.startpay.token_request_completed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      processId: process.pid,
      durationMs: Math.round(performance.now() - tokenStartedAt),
      tokenPresent: typeof token === "string" && Boolean(token.trim()),
      tokenLength: typeof token === "string" ? token.length : 0,
    });
  } catch (error) {
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.startpay.token_request_failed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      processId: process.pid,
      durationMs: Math.round(performance.now() - tokenStartedAt),
      errorName: error.name,
      errorCode: error.code ?? null,
      errorMessage: error.message,
      httpStatus: error.response?.status ?? null,
      supplierRequestSent: false,
    });

    throw error;
  }

  if (typeof token !== "string" || !token.trim()) {
    const error = new Error(
      "AKBAR token is empty; StartPay request was not sent"
    );

    error.statusCode = 503;
    error.supplierRequestSent = false;

    logHotelEvent("error", "hotel.supplier_token.unavailable", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      tokenPresent: false,
      supplierRequestSent: false,
    });

    throw error;
  }

  logHotelEvent("info", "hotel.supplier_token.resolved", {
    correlationId,
    bookingId: String(booking._id),
    supplier: "AKBAR",
    operation: "start_payment",
    tokenPresent: true,
  });

  const payload = {
    SID: itineraryResponse.SID ?? null,
    TUI: tui,
    ClientID: clientId,
    Email: booking.contactInfo.email,
    Promo: null,
    TransactionID: transactionId,
    PaymentType: "",
    BankCode: "",
    GateWayCode: "",
    MerchantID: merchantId,
    PaymentAmount: netAmount,
    PaymentCharge: 0,
    Card: {
      Number: "",
      Expiry: "",
      CVV: "",
      CHName: "",
      FName: null,
      LName: null,
      Address: "",
      City: "",
      State: "",
      Country: "",
      PIN: "",
      International: false,
      SaveCard: false,
      EMIMonths: "0",
      Token: null,
      NumberAlias: null,
    },
    VPA: "",
    CardAlias: "",
    QuickPay: null,
    RMSSignature: "",
    TargetCurrency: "",
    TargetAmount: 0,
    ThirdPartyInfo: null,
    Hold: false,
    TripType: null,
    Authorization: `Bearer ${token}`,
    QTransactionID: itineraryResponse.QTransactionID ?? 0,
    NetAmount: netAmount,
    OnlinePayment: false,
    DepositPayment: true,
    ReleaseDate: "/Date(-62135596800000)/",
    BrowserKey: browserKey,
    BrowserKeyFromToken: browserKey,
    AgentInfo: agentInfo,
  };

  const startedAt = performance.now();

  logHotelEvent("info", "hotel.startpay.request_prepared", {
    correlationId,
    bookingId: String(booking._id),
    supplier: "AKBAR",
    operation: "start_payment",
    processId: process.pid,
    host: endpoint.host,
    pathname: endpoint.pathname,
    method: "POST",
    payloadFieldCount: Object.keys(payload).length,
    payloadFieldsPresent: {
      SID: payload.SID !== null && payload.SID !== undefined,
      TUI: Boolean(payload.TUI),
      ClientID: Boolean(payload.ClientID),
      Email: Boolean(payload.Email),
      TransactionID: Number.isSafeInteger(payload.TransactionID),
      MerchantID: Number.isSafeInteger(payload.MerchantID),
      PaymentAmount: Number.isFinite(payload.PaymentAmount),
      BrowserKey: Boolean(payload.BrowserKey),
      AgentInfo: Boolean(payload.AgentInfo),
      Authorization: Boolean(payload.Authorization),
    },
    amount: netAmount,
    currency: booking.price?.currency ?? null,
    timeoutMs: 60000,
    requestSent: false,
  });

  try {
    logHotelEvent("info", "hotel.startpay.axios_dispatch", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      host: endpoint.host,
      pathname: endpoint.pathname,
      method: "POST",
      timeoutMs: 60000,
    });

    const response = await axios.post(endpoint.toString(), payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 60000,
    });

    const supplierData = unwrapSupplierResponse(response.data);

    logHotelEvent("info", "hotel.supplier_request.completed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      host: endpoint.host,
      path: endpoint.pathname,
      durationMs: Math.round(performance.now() - startedAt),
      totalFlowDurationMs: Math.round(
        performance.now() - flowStartedAt
      ),
      httpStatus: response.status,
      ...getSupplierResponseSummary(response.data),
      bookStatus: supplierData.BookStatus ?? null,
      hasCrsPnr: Boolean(supplierData.CRSPNR),
      tui: maskSupplierTracingKey(supplierData.TUI ?? tui),
    });

    return response.data;
  } catch (error) {
    error.supplierRequestSent = true;
    error.supplierDefinitiveFailure =
      error.response?.status >= 400 && error.response.status < 500;

    logHotelEvent("error", "hotel.supplier_request.failed", {
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      processId: process.pid,
      host: endpoint.host,
      path: endpoint.pathname,
      method: "POST",
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      totalFlowDurationMs: Math.round(
        performance.now() - flowStartedAt
      ),
      errorName: error.name,
      errorCode: error.code ?? null,
      errorMessage: error.message,
      requestMayHaveReachedSupplier: Boolean(error.request),
      supplierRequestSent: true,
      ...getSupplierResponseSummary(error.response?.data),
    });

    throw error;
  }
};

export const getAkbarStartPayResponseData = unwrapSupplierResponse;
