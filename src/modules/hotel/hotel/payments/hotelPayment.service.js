import { randomUUID } from "node:crypto";
import HotelItinerary from "../itinerary/hotelItinerary.model.js";
import PaymentGateway from "../../../gateways/models/paymentGateway.model.js";
import HotelPaymentTransaction from "./models/hotelPaymentTransaction.model.js";
import { createHotelPaymentGateway } from "./paymentGateway.factory.js";
import { getAkbarStartPayResponseData, startAkbarHotelPay } from "./adapters/akbar/startPay.api.js";
import { logHotelEvent } from "../utils/hotelObservability.js";

const supportedGateways = new Set(["razorpay", "stripe"]);

const getError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const logGatewayEvent = (level, event, fields) =>
  logHotelEvent(level, `hotel.payment.${event}`, fields);

const getOwnedBooking = async (bookingId, userId) => {
  const booking = await HotelItinerary.findById(bookingId);
  if (!booking) {
    throw getError("Hotel booking was not found", 404);
  }
  if (!booking.userId || String(booking.userId) !== String(userId)) {
    throw getError("You are not authorized to access this hotel booking", 403);
  }
  return booking;
};

const getPaymentState = (booking, transaction = null) => ({
  bookingId: String(booking._id),
  itineraryStatus: booking.itineraryStatus,
  paymentStatus: booking.paymentStatus,
  supplierBookingStatus: booking.supplierBookingStatus ?? "awaiting_payment",
  message:
    booking.supplierBookingStatus === "confirmed"
      ? "Hotel booking confirmed"
      : booking.supplierBookingStatus === "failed"
        ? "Hotel booking could not be confirmed. Any captured payment is being refunded."
        : booking.supplierBookingStatus === "unknown"
          ? "Payment received; hotel confirmation is pending. Check the booking status before retrying."
          : booking.supplierBookingStatus === "processing"
            ? "Payment received; hotel booking is being confirmed."
            : "Complete payment to confirm this hotel booking.",
  gateway: transaction?.gateway ?? null,
  paymentTransactionId: transaction?.transactionId ?? null,
  hotel: {
    hotelId: booking.hotel?.hotelId ?? booking.hotelId,
    name: booking.hotel?.name ?? null,
    address: booking.hotel?.address ?? null,
    starRating: booking.hotel?.starRating ?? null,
  },
  stay: booking.stay,
  amount: booking.price?.total ?? null,
  currency: booking.price?.currency ?? null,
  crsPnr:
    booking.supplierBookingResponse?.CRSPNR ??
    booking.supplierBookingResponse?.data?.CRSPNR ??
    null,
});

const getConfiguredGateway = async ({ gatewayName, currency }) => {
  if (gatewayName && !supportedGateways.has(gatewayName)) {
    throw getError(`Unsupported hotel payment gateway: ${gatewayName}`, 400);
  }

  const query = {
    isActive: true,
    supportedCurrencies: { $in: [currency] },
    ...(gatewayName ? { name: gatewayName } : { name: { $in: [...supportedGateways] } }),
  };
  const gateway = await PaymentGateway.findOne(query).sort({ priority: 1 });
  if (!gateway) {
    throw getError(
      gatewayName
        ? `${gatewayName} is not enabled for ${currency}`
        : `No hotel payment gateway is enabled for ${currency}`,
      503
    );
  }
  return gateway.name;
};

const getOrderResponse = async (transaction) => {
  const gateway = createHotelPaymentGateway(transaction.gateway);
  const checkout = await gateway.getCheckoutDetails(transaction);
  return {
    transactionId: transaction.transactionId,
    gateway: transaction.gateway,
    paymentData: checkout,
  };
};

export const createHotelPaymentOrder = async ({
  bookingId,
  userId,
  gateway: requestedGateway,
}) => {
  const booking = await getOwnedBooking(bookingId, userId);
  if (booking.itineraryStatus !== "created") {
    throw getError("Hotel itinerary must be created before payment", 409);
  }
  if (booking.paymentStatus !== "pending") {
    throw getError("This hotel booking is not awaiting customer payment", 409);
  }
  if (
    booking.supplierBookingStatus &&
    booking.supplierBookingStatus !== "awaiting_payment"
  ) {
    throw getError("Supplier booking is not awaiting payment", 409);
  }

  const amount = Number(booking.price?.total);
  const currency = String(booking.price?.currency ?? "INR").toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw getError("Hotel booking amount is invalid", 409);
  }

  const correlationId = String(booking._id);
  const existing = await HotelPaymentTransaction.findOne({
    bookingId: booking._id,
    userId,
    status: "pending",
  }).sort({ createdAt: -1 });
  if (existing) {
    if (requestedGateway && existing.gateway !== requestedGateway) {
      throw getError(
        `A pending ${existing.gateway} payment order already exists for this booking`,
        409
      );
    }
    logGatewayEvent("info", "order.reused", {
      correlationId: String(booking._id),
      bookingId: String(booking._id),
      transactionId: existing.transactionId,
      gateway: existing.gateway,
    });
    return getOrderResponse(existing);
  }

  const gatewayName = await getConfiguredGateway({
    gatewayName: requestedGateway,
    currency,
  });
  const lock = await HotelItinerary.findOneAndUpdate(
    {
      _id: booking._id,
      userId,
      paymentStatus: "pending",
      supplierBookingStatus: { $in: ["awaiting_payment", null] },
      paymentOrderStatus: { $in: ["idle", "failed", null] },
    },
    {
      $set: {
        paymentOrderStatus: "creating",
        paymentGateway: gatewayName,
      },
    },
    { returnDocument: "after" }
  );
  if (!lock) {
    throw getError("A payment order is already being created for this booking", 409);
  }

  const transactionId = randomUUID();
  logGatewayEvent("info", "order.started", {
    correlationId,
    bookingId: String(booking._id),
    transactionId,
    gateway: gatewayName,
    amount,
    currency,
  });
  const startedAt = performance.now();

  try {
    const gateway = createHotelPaymentGateway(gatewayName);
    const order = await gateway.createOrder({
      amount,
      currency,
      bookingId: String(booking._id),
    });
    const transaction = await HotelPaymentTransaction.create({
      transactionId,
      bookingId: booking._id,
      userId,
      gateway: gatewayName,
      amount,
      currency,
      gatewayOrderId: order.gatewayOrderId,
      status: "pending",
    });
    lock.paymentOrderStatus = "created";
    lock.paymentTransactionId = transaction.transactionId;
    await lock.save();

    logGatewayEvent("info", "order.completed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId,
      gateway: gatewayName,
      amount,
      currency,
      durationMs: Math.round(performance.now() - startedAt),
      gatewayOrderId: order.gatewayOrderId,
    });
    return {
      transactionId,
      gateway: gatewayName,
      paymentData: order.checkout,
    };
  } catch (error) {
    lock.paymentOrderStatus = "failed";
    lock.paymentGateway = null;
    await lock.save();
    logGatewayEvent("error", "order.failed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId,
      gateway: gatewayName,
      amount,
      currency,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    throw error;
  }
};

const issueCustomerRefund = async ({ booking, transaction, correlationId }) => {
  booking.paymentStatus = "refund_pending";
  transaction.status = "refund_pending";
  transaction.lastError = booking.supplierBookingError;
  await Promise.all([booking.save(), transaction.save()]);

  const startedAt = performance.now();
  try {
    const gateway = createHotelPaymentGateway(transaction.gateway);
    const refund = await gateway.refundPayment({
      paymentId: transaction.gatewayPaymentId,
      amount: transaction.amount,
    });
    transaction.refundId = refund.id ?? refund.refundId ?? null;
    transaction.refundAmount = transaction.amount;
    const refundComplete =
      refund.status === "processed" ||
      refund.status === "succeeded" ||
      refund.status === "completed";
    if (refundComplete) {
      transaction.status = "refunded";
      transaction.refundedAt = new Date();
      booking.paymentStatus = "refunded";
    }
    await Promise.all([booking.save(), transaction.save()]);
    logGatewayEvent("info", "refund.completed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
      refundStatus: refund.status ?? "pending",
      durationMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    transaction.lastError = error.message;
    await transaction.save();
    await booking.save();
    logGatewayEvent("error", "refund.failed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
  }
};

const startSupplierBooking = async ({ booking, transaction }) => {
  const correlationId = String(booking._id);
  const claimedBooking = await HotelItinerary.findOneAndUpdate(
    {
      _id: booking._id,
      paymentStatus: "paid",
      supplierBookingStatus: { $in: ["awaiting_payment", null] },
      paymentTransactionId: transaction.transactionId,
    },
    { $set: { supplierBookingStatus: "processing" } },
    { returnDocument: "after" }
  );
  if (!claimedBooking) {
    const latestBooking = await HotelItinerary.findById(booking._id);
    if (!latestBooking) {
      throw getError("Hotel booking was not found", 404);
    }
    return getPaymentState(latestBooking, transaction);
  }

  transaction.supplierBookingStatus = "processing";
  await transaction.save();
  logGatewayEvent("info", "supplier_booking.started", {
    correlationId,
    bookingId: String(booking._id),
    transactionId: transaction.transactionId,
    gateway: transaction.gateway,
    supplier: "AKBAR",
  });

  const startedAt = performance.now();
  try {
    const supplierResponse = await startAkbarHotelPay({
      booking: claimedBooking,
      correlationId,
    });
    const supplierData = getAkbarStartPayResponseData(supplierResponse);
    const supplierCode = supplierData.Code ?? supplierData.code;
    const rawMessage = supplierData.Msg ?? supplierData.Message ?? supplierData.message;
    const supplierMessage = Array.isArray(rawMessage)
      ? rawMessage.filter(Boolean).join("; ").slice(0, 300)
      : typeof rawMessage === "string"
        ? rawMessage.slice(0, 300)
        : null;
    claimedBooking.supplierBookingResponse = supplierResponse;

    if (String(supplierCode) !== "200") {
      claimedBooking.supplierBookingStatus = "failed";
      claimedBooking.supplierBookingError =
        supplierMessage ?? "AKBAR rejected the booking payment";
      transaction.supplierBookingStatus = "failed";
      transaction.lastError = claimedBooking.supplierBookingError;
      await Promise.all([claimedBooking.save(), transaction.save()]);
      logGatewayEvent("error", "supplier_booking.rejected", {
        correlationId,
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        gateway: transaction.gateway,
        supplier: "AKBAR",
        supplierCode: supplierCode ?? null,
        supplierMessage,
        durationMs: Math.round(performance.now() - startedAt),
      });
      await issueCustomerRefund({ booking: claimedBooking, transaction, correlationId });
      return getPaymentState(claimedBooking, transaction);
    }

    claimedBooking.supplierBookingStatus = "confirmed";
    claimedBooking.paymentStatus = "paid";
    transaction.supplierBookingStatus = "confirmed";
    await Promise.all([claimedBooking.save(), transaction.save()]);
    logGatewayEvent("info", "supplier_booking.confirmed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
      supplier: "AKBAR",
      supplierCode,
      bookStatus: supplierData.BookStatus ?? null,
      hasCrsPnr: Boolean(supplierData.CRSPNR),
      durationMs: Math.round(performance.now() - startedAt),
    });
    return getPaymentState(claimedBooking, transaction);
  } catch (error) {
    const supplierFailureIsDefinitive =
      error.supplierRequestSent === false ||
      error.supplierDefinitiveFailure === true;
    claimedBooking.supplierBookingStatus = supplierFailureIsDefinitive
      ? "failed"
      : "unknown";
    claimedBooking.supplierBookingError = error.message;
    transaction.supplierBookingStatus = claimedBooking.supplierBookingStatus;
    transaction.lastError = error.message;
    await Promise.all([claimedBooking.save(), transaction.save()]);
    logGatewayEvent("error", "supplier_booking.failed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
      supplier: "AKBAR",
      finalState: claimedBooking.supplierBookingStatus,
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    if (supplierFailureIsDefinitive) {
      await issueCustomerRefund({ booking: claimedBooking, transaction, correlationId });
    }
    return getPaymentState(claimedBooking, transaction);
  }
};

const recordCapturedPayment = async ({ transaction, gatewayPaymentId }) => {
  if (transaction.status === "refunded" || transaction.status === "refund_pending") {
    const booking = await HotelItinerary.findById(transaction.bookingId);
    if (!booking) throw getError("Hotel booking was not found", 404);
    return getPaymentState(booking, transaction);
  }

  transaction.status = "success";
  transaction.gatewayPaymentId = gatewayPaymentId;
  await transaction.save();
  const booking = await HotelItinerary.findById(transaction.bookingId);
  if (!booking || String(booking.userId) !== String(transaction.userId)) {
    throw getError("Hotel booking for this payment was not found", 404);
  }
  if (
    booking.paymentTransactionId &&
    booking.paymentTransactionId !== transaction.transactionId
  ) {
    throw getError("A different payment transaction is linked to this booking", 409);
  }
  if (booking.paymentStatus !== "paid") {
    booking.paymentStatus = "paid";
    booking.paymentTransactionId = transaction.transactionId;
    booking.supplierBookingStatus = "awaiting_payment";
    await booking.save();
  }
  return startSupplierBooking({ booking, transaction });
};

export const verifyHotelPayment = async ({
  transactionId,
  gatewayOrderId,
  paymentId,
  signature,
  gatewayName,
  userId,
}) => {
  const transaction = await HotelPaymentTransaction.findOne({
    transactionId,
    userId,
  });
  if (!transaction) throw getError("Payment transaction was not found", 404);
  if (gatewayName && gatewayName !== transaction.gateway) {
    throw getError("Payment gateway does not match this transaction", 400);
  }
  if (transaction.status === "failed") {
    throw getError("Payment transaction has failed", 409);
  }

  const orderId =
    transaction.gateway === "stripe"
      ? gatewayOrderId ?? paymentId
      : gatewayOrderId;
  if (orderId !== transaction.gatewayOrderId) {
    throw getError("Payment order does not match this transaction", 400);
  }

  const correlationId = String(transaction.bookingId);
  logGatewayEvent("info", "verification.started", {
    correlationId,
    bookingId: String(transaction.bookingId),
    transactionId,
    gateway: transaction.gateway,
    gatewayOrderId: transaction.gatewayOrderId,
  });
  const startedAt = performance.now();
  try {
    const gateway = createHotelPaymentGateway(transaction.gateway);
    const verification = await gateway.verifyPayment({
      gatewayOrderId: transaction.gatewayOrderId,
      paymentId,
      signature,
      expectedAmount: transaction.amount,
      expectedCurrency: transaction.currency,
    });
    if (!verification.success) {
      logGatewayEvent("error", "verification.rejected", {
        correlationId,
        bookingId: String(transaction.bookingId),
        transactionId,
        gateway: transaction.gateway,
        durationMs: Math.round(performance.now() - startedAt),
        reason: verification.reason,
      });
      throw getError(verification.reason, 400);
    }
    logGatewayEvent("info", "verification.completed", {
      correlationId,
      bookingId: String(transaction.bookingId),
      transactionId,
      gateway: transaction.gateway,
      durationMs: Math.round(performance.now() - startedAt),
      paymentCaptured: true,
    });
    return recordCapturedPayment({
      transaction,
      gatewayPaymentId: verification.gatewayPaymentId,
    });
  } catch (error) {
    if (error.statusCode === 400) throw error;
    logGatewayEvent("error", "verification.failed", {
      correlationId,
      bookingId: String(transaction.bookingId),
      transactionId,
      gateway: transaction.gateway,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    throw error;
  }
};

export const getHotelPaymentStatus = async ({ bookingId, userId }) => {
  const booking = await getOwnedBooking(bookingId, userId);
  const transaction = booking.paymentTransactionId
    ? await HotelPaymentTransaction.findOne({
        transactionId: booking.paymentTransactionId,
      })
    : null;
  return getPaymentState(booking, transaction);
};

export const handleHotelPaymentWebhook = async ({
  gatewayName,
  gatewayOrderId,
  gatewayPaymentId,
  gatewayAmount,
  gatewayCurrency,
}) => {
  const transaction = await HotelPaymentTransaction.findOne({
    gateway: gatewayName,
    gatewayOrderId,
  });
  if (!transaction) {
    throw getError("Hotel payment transaction for gateway order was not found", 404);
  }
  if (
    gatewayAmount !== Math.round(transaction.amount * 100) ||
    String(gatewayCurrency).toUpperCase() !== transaction.currency
  ) {
    throw getError("Webhook payment amount or currency does not match the order", 400);
  }
  return recordCapturedPayment({ transaction, gatewayPaymentId });
};

export const handleHotelPaymentRefundWebhook = async ({
  gatewayName,
  gatewayPaymentId,
  refundId,
  refundStatus,
  refundAmount,
}) => {
  const transaction = await HotelPaymentTransaction.findOne({
    gateway: gatewayName,
    gatewayPaymentId,
  });
  if (!transaction) {
    throw getError("Hotel payment transaction for gateway refund was not found", 404);
  }
  if (
    !["processed", "succeeded", "completed"].includes(refundStatus) ||
    refundAmount !== Math.round(transaction.amount * 100)
  ) {
    return;
  }

  transaction.status = "refunded";
  transaction.refundId = refundId;
  transaction.refundAmount = transaction.amount;
  transaction.refundedAt = new Date();
  await transaction.save();
  await HotelItinerary.findByIdAndUpdate(transaction.bookingId, {
    $set: { paymentStatus: "refunded" },
  });
  logGatewayEvent("info", "refund.webhook_processed", {
    correlationId: String(transaction.bookingId),
    bookingId: String(transaction.bookingId),
    transactionId: transaction.transactionId,
    gateway: gatewayName,
    refundStatus,
  });
};
