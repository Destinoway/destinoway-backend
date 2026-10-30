// import "dotenv/config";
// import axios from "axios";
// import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
// import {
//   getSupplierResponseSummary,
//   logHotelEvent,
//   maskSupplierTracingKey,
// } from "../../../utils/hotelObservability.js";

// const getStartPayEndpoint = () => {
//   const configuredUrl = process.env.START_PAY_URL;
//   if (!configuredUrl?.trim()) {
//     const error = new Error("START_PAY_URL is not configured");
//     error.statusCode = 503;
//     error.supplierRequestSent = false;
//     throw error;
//   }

//   try {
//     const baseUrl = new URL(configuredUrl.trim());
//     if (baseUrl.protocol !== "https:" || !baseUrl.hostname) {
//       throw new Error("START_PAY_URL must be a valid HTTPS URL");
//     }
//     return new URL("/Payment/StartPay", baseUrl.origin);
//   } catch (error) {
//     error.statusCode = 503;
//     error.supplierRequestSent = false;
//     logHotelEvent("error", "hotel.supplier_config.invalid", {
//       supplier: "AKBAR",
//       operation: "start_payment",
//       variable: "START_PAY_URL",
//       configured: true,
//       valueLength: configuredUrl.length,
//       containsWhitespace: /\s/.test(configuredUrl),
//       errorName: error.name,
//       errorMessage: error.message,
//     });
//     throw error;
//   }
// };

// const unwrapSupplierResponse = (response) =>
//   response && typeof response === "object" ? response.data ?? response : {};

// const getStartPayConfig = () => {
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
//       "AKBAR StartPay configuration is incomplete or invalid"
//     );
//     error.statusCode = 503;
//     error.supplierRequestSent = false;
//     throw error;
//   }

//   return { browserKey, agentInfo, clientId, merchantId };
// };

// const getItineraryValues = (booking) => {
//   const itinerary =
//     booking.itineraryResponse?.data ?? booking.itineraryResponse ?? {};
//   const tui = itinerary.TUI ?? itinerary.Tui;
//   const transactionId = Number(booking.transactionId);
//   const amount = Number(
//     itinerary.NetAmount ?? itinerary.netAmount ?? booking.price?.total
//   );

//   if (typeof tui !== "string" || !tui.trim()) {
//     const error = new Error("AKBAR itinerary TUI is missing for StartPay");
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }
//   if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
//     const error = new Error(
//       "AKBAR itinerary TransactionID is invalid for StartPay"
//     );
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }
//   if (!Number.isFinite(amount) || amount <= 0) {
//     const error = new Error("AKBAR itinerary NetAmount is invalid for StartPay");
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }
//   if (!booking.contactInfo?.email) {
//     const error = new Error("Hotel booking contact email is missing");
//     error.statusCode = 409;
//     error.supplierRequestSent = false;
//     throw error;
//   }

//   return { itinerary, tui, transactionId, amount };
// };

// const buildStartPayPayload = ({
//   booking,
//   itinerary,
//   tui,
//   transactionId,
//   amount,
//   config,
//   token,
// }) => ({
//   SID: itinerary.SID ?? null,
//   TUI: tui,
//   ClientID: config.clientId,
//   Email: booking.contactInfo.email,
//   Promo: null,
//   TransactionID: transactionId,
//   PaymentType: "",
//   BankCode: "",
//   GateWayCode: "",
//   MerchantID: config.merchantId,
//   PaymentAmount: amount,
//   PaymentCharge: 0,
//   Card: {
//     Number: "",
//     Expiry: "",
//     CVV: "",
//     CHName: "",
//     FName: null,
//     LName: null,
//     Address: "",
//     City: "",
//     State: "",
//     Country: "",
//     PIN: "",
//     International: false,
//     SaveCard: false,
//     EMIMonths: "0",
//     Token: null,
//     NumberAlias: null,
//   },
//   VPA: "",
//   CardAlias: "",
//   QuickPay: null,
//   RMSSignature: "",
//   TargetCurrency: "",
//   TargetAmount: 0,
//   ThirdPartyInfo: null,
//   Hold: false,
//   TripType: null,
//   Authorization: `Bearer ${token}`,
//   QTransactionID: itinerary.QTransactionID ?? 0,
//   NetAmount: amount,
//   OnlinePayment: false,
//   DepositPayment: true,
//   ReleaseDate: "/Date(-62135596800000)/",
//   BrowserKey: config.browserKey,
//   BrowserKeyFromToken: config.browserKey,
//   AgentInfo: config.agentInfo,
// });

// export const startAkbarHotelPay = async ({ booking, correlationId }) => {
//   const bookingId = String(booking?._id ?? "");
//   const startedAt = performance.now();
//   const logContext = {
//     correlationId,
//     bookingId,
//     supplier: "AKBAR",
//     operation: "start_payment",
//     processId: process.pid,
//   };

//   logHotelEvent("info", "hotel.supplier_booking.startpay_started", logContext);

//   try {
//     const config = getStartPayConfig();
//     const endpoint = getStartPayEndpoint();
//     const itineraryValues = getItineraryValues(booking);

//     logHotelEvent("info", "hotel.supplier_booking.startpay_token_lookup", {
//       ...logContext,
//       host: endpoint.host,
//       path: endpoint.pathname,
//       tui: maskSupplierTracingKey(itineraryValues.tui),
//     });

//     const token = await getAKBARToken({
//       operation: "start_payment",
//       correlationId,
//     });
//     if (typeof token !== "string" || !token.trim()) {
//       const error = new Error("AKBAR token is unavailable for StartPay");
//       error.statusCode = 503;
//       error.supplierRequestSent = false;
//       throw error;
//     }

//     const payload = buildStartPayPayload({
//       booking,
//       ...itineraryValues,
//       config,
//       token,
//     });
//     logHotelEvent("info", "hotel.supplier_booking.startpay_request_started", {
//       ...logContext,
//       host: endpoint.host,
//       path: endpoint.pathname,
//       amount: itineraryValues.amount,
//       currency: booking.price?.currency ?? null,
//       timeoutMs: 60000,
//       tui: maskSupplierTracingKey(itineraryValues.tui),
//     });

//     let response;
//     try {
//       response = await axios.post(endpoint.toString(), payload, {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         timeout: 60000,
//       });
//     } catch (error) {
//       error.supplierRequestSent = true;
//       error.supplierDefinitiveFailure =
//         error.response?.status >= 400 && error.response.status < 500;
//       logHotelEvent("error", "hotel.supplier_request.failed", {
//         ...logContext,
//         host: endpoint.host,
//         path: endpoint.pathname,
//         httpStatus: error.response?.status ?? null,
//         durationMs: Math.round(performance.now() - startedAt),
//         errorCode: error.code ?? null,
//         errorMessage: error.message,
//         requestMayHaveReachedSupplier: Boolean(error.request),
//         ...getSupplierResponseSummary(error.response?.data),
//       });
//       throw error;
//     }

//     const supplierData = unwrapSupplierResponse(response.data);
//     logHotelEvent("info", "hotel.supplier_request.completed", {
//       ...logContext,
//       host: endpoint.host,
//       path: endpoint.pathname,
//       httpStatus: response.status,
//       durationMs: Math.round(performance.now() - startedAt),
//       ...getSupplierResponseSummary(response.data),
//       supplierCode: supplierData.Code ?? supplierData.code ?? null,
//       bookStatus: supplierData.BookStatus ?? null,
//       hasCrsPnr: Boolean(supplierData.CRSPNR),
//       tui: maskSupplierTracingKey(supplierData.TUI ?? itineraryValues.tui),
//     });
//     return response.data;
//   } catch (error) {
//     if (error.supplierRequestSent === undefined) {
//       error.supplierRequestSent = false;
//     }
//     logHotelEvent("error", "hotel.supplier_booking.startpay_failed", {
//       ...logContext,
//       durationMs: Math.round(performance.now() - startedAt),
//       stage: error.supplierRequestSent ? "supplier_request" : "pre_request",
//       errorName: error.name,
//       errorCode: error.code ?? null,
//       errorMessage: error.message,
//       httpStatus: error.response?.status ?? null,
//       supplierRequestSent: error.supplierRequestSent,
//     });
//     throw error;
//   }
// };

// export const getAkbarStartPayResponseData = unwrapSupplierResponse;


import "dotenv/config";
import os from "node:os";
import axios from "axios";

import AkbarToken from "../../../../supplier/akbar/akbarToken.model.js";

import {
  getSupplierResponseSummary,
  logHotelEvent,
  maskSupplierTracingKey,
} from "../../../utils/hotelObservability.js";

/**
 * Returns local network-interface addresses.
 *
 * Note:
 * - These are the IP addresses configured on the EC2 machine.
 * - They are NOT necessarily the public IP seen by Akbar.
 * - SUPPLIER_EGRESS_PUBLIC_IP can be configured separately for logging.
 */
const getServerNetworkContext = () => {
  const interfaces = os.networkInterfaces();
  const localAddresses = [];

  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.internal) continue;

      localAddresses.push({
        interface: interfaceName,
        family: address.family,
        address: address.address,
      });
    }
  }

  return {
    hostname: os.hostname(),
    processId: process.pid,
    nodeVersion: process.version,
    localAddresses,
    configuredPublicEgressIp:
      process.env.SUPPLIER_EGRESS_PUBLIC_IP || null,
  };
};

const getStartPayEndpoint = () => {
  const configuredUrl = process.env.START_PAY_URL;

  if (!configuredUrl?.trim()) {
    const error = new Error("START_PAY_URL is not configured");
    error.statusCode = 503;
    error.supplierRequestSent = false;
    throw error;
  }

  try {
    const baseUrl = new URL(configuredUrl.trim());

    if (baseUrl.protocol !== "https:" || !baseUrl.hostname) {
      throw new Error("START_PAY_URL must be a valid HTTPS URL");
    }

    // Log only the origin and expected endpoint; never log credentials
    // or query-string values.
    return new URL("/Payment/StartPay", baseUrl.origin);
  } catch (error) {

    const configError = new Error(
      "START_PAY_URL is invalid. A valid HTTPS URL is required."
    );

    configError.statusCode = 503;
    configError.supplierRequestSent = false;

    throw configError;
  }
};

const unwrapSupplierResponse = (response) =>
  response && typeof response === "object"
    ? response.data ?? response
    : {};

const getStoredAkbarToken = async ({ correlationId, bookingId }) => {
  const startedAt = performance.now();

  try {
    const record = await AkbarToken.findOne({
      _id: "hotel",
      expiresAt: { $gt: new Date() },
    })
      .select("token")
      .lean();

    if (typeof record?.token !== "string" || !record.token.trim()) {
      const error = new Error(
        "No valid AKBAR token was found in MongoDB; refresh the Signature token before StartPay"
      );
      error.statusCode = 503;
      error.supplierRequestSent = false;
      throw error;
    }

    return record.token;
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 503;
      error.supplierRequestSent = false;
    }
    throw error;
  }
};

const getStartPayConfig = () => {
  const browserKey = process.env.AKBAR_BROWSER_KEY;
  const agentInfo = process.env.AKBAR_AGENT_INFO;
  const clientId = process.env.AKBAR_CLIENT_ID;
  const merchantId = Number(process.env.AKBAR_MERCHANT_ID);

  if (
    !browserKey ||
    !agentInfo ||
    !clientId ||
    !process.env.AKBAR_MERCHANT_ID ||
    !Number.isSafeInteger(merchantId) ||
    merchantId < 0
  ) {
    const error = new Error(
      "AKBAR StartPay configuration is incomplete or invalid"
    );

    error.statusCode = 503;
    error.supplierRequestSent = false;

    throw error;
  }

  return {
    browserKey,
    agentInfo,
    clientId,
    merchantId,
  };
};

const getItineraryValues = (booking) => {
  const itinerary =
    booking.itineraryResponse?.data ??
    booking.itineraryResponse ??
    {};

  const tui = itinerary.TUI ?? itinerary.Tui;
  const transactionId = Number(booking.transactionId);

  const amount = Number(
    itinerary.NetAmount ??
      itinerary.netAmount ??
      booking.price?.total
  );

  if (typeof tui !== "string" || !tui.trim()) {
    const error = new Error(
      "AKBAR itinerary TUI is missing for StartPay"
    );

    error.statusCode = 409;
    error.supplierRequestSent = false;

    throw error;
  }

  if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
    const error = new Error(
      "AKBAR itinerary TransactionID is invalid for StartPay"
    );

    error.statusCode = 409;
    error.supplierRequestSent = false;

    throw error;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error(
      "AKBAR itinerary NetAmount is invalid for StartPay"
    );

    error.statusCode = 409;
    error.supplierRequestSent = false;

    throw error;
  }

  if (!booking.contactInfo?.email) {
    const error = new Error(
      "Hotel booking contact email is missing"
    );

    error.statusCode = 409;
    error.supplierRequestSent = false;

    throw error;
  }

  return {
    itinerary,
    tui,
    transactionId,
    amount,
  };
};

const buildStartPayPayload = ({
  booking,
  itinerary,
  tui,
  transactionId,
  amount,
  config,
  token,
}) => ({
  SID: itinerary.SID ?? null,
  TUI: tui,
  ClientID: config.clientId,
  Email: booking.contactInfo.email,
  Promo: null,
  TransactionID: transactionId,
  PaymentType: "",
  BankCode: "",
  GateWayCode: "",
  MerchantID: config.merchantId,
  PaymentAmount: amount,
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
  QTransactionID: itinerary.QTransactionID ?? 0,
  NetAmount: amount,
  OnlinePayment: false,
  DepositPayment: true,
  ReleaseDate: "/Date(-62135596800000)/",
  BrowserKey: config.browserKey,
  BrowserKeyFromToken: config.browserKey,
  AgentInfo: config.agentInfo,
});

export const startAkbarHotelPay = async ({
  booking,
  correlationId,
}) => {
  const bookingId = String(booking?._id ?? "");
  const startedAt = performance.now();

  const logContext = {
    correlationId,
    bookingId,
    supplier: "AKBAR",
    operation: "start_payment",
    processId: process.pid,
  };


  let endpoint = null;
  let tuiForLogging = null;

  try {
    const config = getStartPayConfig();
    endpoint = getStartPayEndpoint();

    const itineraryValues = getItineraryValues(booking);
    tuiForLogging = maskSupplierTracingKey(itineraryValues.tui);


    const tokenLookupStartedAt = performance.now();

    let token;

    try {
      token = await getStoredAkbarToken({
        correlationId,
        bookingId,
      });
    } catch (error) {

      throw error;
    }


    if (typeof token !== "string" || !token.trim()) {
      const error = new Error(
        "AKBAR token is unavailable for StartPay"
      );

      error.statusCode = 503;
      error.supplierRequestSent = false;

      throw error;
    }

    const payload = buildStartPayPayload({
      booking,
      ...itineraryValues,
      config,
      token,
    });

    const requestStartedAt = performance.now();


    let response;

    try {
      response = await axios.post(endpoint.toString(), payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 60000,
      });
    } catch (error) {
      // This means the request was attempted. It does not prove
      // the supplier received or processed the complete request.
      error.supplierRequestSent = true;
      error.supplierDefinitiveFailure =
        error.response?.status >= 400 &&
        error.response.status < 500;


      throw error;
    }

    const supplierData = unwrapSupplierResponse(response.data);


    return response.data;
  } catch (error) {
    if (error.supplierRequestSent === undefined) {
      error.supplierRequestSent = false;
    }


    throw error;
  }
};

export const getAkbarStartPayResponseData = unwrapSupplierResponse;