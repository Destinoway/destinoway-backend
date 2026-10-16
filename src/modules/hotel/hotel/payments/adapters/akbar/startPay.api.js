import axios from "axios";
import { getAKBARToken } from "../../../../supplier/akbar/akbarAuth.service.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
  maskSupplierTracingKey,
} from "../../../utils/hotelObservability.js";

const getBookingBaseUrl = () => {
  const configuredUrl =
    process.env.START_PAY_URL
  if (!configuredUrl) {
    const error = new Error(
      "AKBAR_HOTEL_BOOKING_URL or an existing AKBAR hotel URL must be configured"
    );
    error.statusCode = 503;
    error.supplierRequestSent = false;
    throw error;
  }

  try {
    return new URL(configuredUrl).origin;
  } catch (error) {
    error.supplierRequestSent = false;
    throw error;
  }
};

const unwrapSupplierResponse = (response) =>
  response && typeof response === "object" ? response.data ?? response : {};

export const startAkbarHotelPay = async ({
  booking,
  correlationId,
}) => {
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
      "AKBAR_BROWSER_KEY, AKBAR_AGENT_INFO, AKBAR_CLIENT_ID and AKBAR_MERCHANT_ID must be configured for StartPay"
    );
    error.statusCode = 503;
    error.supplierRequestSent = false;
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
  if (typeof tui !== "string" || !tui.trim()) {
    const error = new Error("AKBAR itinerary TUI is missing for StartPay");
    error.statusCode = 409;
    error.supplierRequestSent = false;
    throw error;
  }
  if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
    const error = new Error("AKBAR itinerary TransactionID is invalid for StartPay");
    error.statusCode = 409;
    error.supplierRequestSent = false;
    throw error;
  }
  if (!Number.isFinite(netAmount) || netAmount <= 0) {
    const error = new Error("AKBAR itinerary NetAmount is invalid for StartPay");
    error.statusCode = 409;
    error.supplierRequestSent = false;
    throw error;
  }

  let token;
  try {
    token = await getAKBARToken();
  } catch (error) {
    error.supplierRequestSent = false;
    throw error;
  }

  const endpoint = new URL("/Payment/StartPay", getBookingBaseUrl());
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
  logHotelEvent("info", "hotel.supplier_request.started", {
    correlationId,
    bookingId: String(booking._id),
    supplier: "AKBAR",
    operation: "start_payment",
    host: endpoint.host,
    path: endpoint.pathname,
    amount: netAmount,
    currency: booking.price?.currency ?? null,
    tui: maskSupplierTracingKey(tui),
  });

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
      correlationId,
      bookingId: String(booking._id),
      supplier: "AKBAR",
      operation: "start_payment",
      durationMs: Math.round(performance.now() - startedAt),
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
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
      ...getSupplierResponseSummary(error.response?.data),
    });
    throw error;
  }
};

export const getAkbarStartPayResponseData = unwrapSupplierResponse;
