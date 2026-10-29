import { randomUUID } from "node:crypto";
import HotelItinerary from "../itinerary/hotelItinerary.model.js";
import PaymentGateway from "../../../gateways/models/paymentGateway.model.js";
import HotelPaymentTransaction from "./models/hotelPaymentTransaction.model.js";
import { sendBookingConfirmationEmail } from "../../../mail/services/bookingConfirmation.mail.js";
import { createHotelPaymentGateway } from "./paymentGateway.factory.js";
import { getAkbarStartPayResponseData, startAkbarHotelPay } from "./adapters/akbar/startPay.api.js";
import {
  getAkbarRetrievedBookingFields,
  retrieveAkbarHotelBooking,
} from "./adapters/akbar/retrieveBooking.api.js";
import {
  cancelAkbarHotelBooking,
  getAkbarCancelBookingResponseData,
} from "./adapters/akbar/cancelBooking.api.js";
import {
  getSupplierResponseSummary,
  logHotelEvent,
  traceHotelPaymentStep,
} from "../utils/hotelObservability.js";

const supportedGateways = new Set(["razorpay", "stripe"]);

const getError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const logGatewayEvent = (level, event, fields) =>
  logHotelEvent(level, `hotel.payment.${event}`, fields);

const emailHotelBookingConfirmation = async ({ booking, correlationId }) => {
  const contact = booking.contactInfo ?? {};
  if (!contact.email) {
    logGatewayEvent("warn", "booking_confirmation_email.skipped", {
      correlationId,
      bookingId: String(booking._id),
      reason: "guest_email_missing",
    });
    return;
  }

  try {
    const latestBooking = await HotelItinerary.findById(booking._id)
      .select("contactInfo hotel stay rooms price bookingRefNo supplierBookingDetails")
      .lean();
    const emailBooking = latestBooking ?? booking;
    const guestNames = (emailBooking.rooms ?? [])
      .flatMap((room) => [...(room.adults ?? []), ...(room.children ?? [])])
      .map((guest) => [guest.firstName, guest.lastName].filter(Boolean).join(" "))
      .filter(Boolean);
    await sendBookingConfirmationEmail({
      email: contact.email,
      customerName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      bookingRefNo: emailBooking.bookingRefNo,
      pnr: emailBooking.supplierBookingDetails?.crsPnr,
      hotelName: emailBooking.hotel?.name ?? "Hotel",
      hotelAddress: emailBooking.hotel?.address ?? "",
      city: emailBooking.hotel?.locationName ?? "",
      checkIn: emailBooking.stay?.checkIn ?? "",
      checkOut: emailBooking.stay?.checkOut ?? "",
      rooms: emailBooking.rooms?.length ?? 0,
      guests: guestNames.join(", "),
      amount: emailBooking.price?.total ?? 0,
      currency: emailBooking.price?.currency ?? "INR",
      voucherNumber: emailBooking.supplierBookingDetails?.voucherNumber,
    });
    logGatewayEvent("info", "booking_confirmation_email.sent", {
      correlationId,
      bookingId: String(booking._id),
      bookingRefNo: emailBooking.bookingRefNo,
    });
  } catch (error) {
    // Email delivery must not change a confirmed supplier booking to failed.
    logGatewayEvent("error", "booking_confirmation_email.failed", {
      correlationId,
      bookingId: String(booking._id),
      bookingRefNo: booking.bookingRefNo,
      errorMessage: error.message,
    });
  }
};

const tracePaymentStep = (correlationId, step, fields, operation) =>
  traceHotelPaymentStep({ correlationId, step, fields, operation });

const getOwnedBooking = async (bookingRefNo, userId) => {
  if (!/^DW-\d{4}-(0[1-9]|1[0-2])-\d{8}$/.test(String(bookingRefNo))) {
    throw getError("Valid bookingRefNo is required", 400);
  }
  const booking = await HotelItinerary.findOne({ bookingRefNo });
  if (!booking) {
    throw getError("Hotel booking was not found", 404);
  }
  if (!booking.userId || String(booking.userId) !== String(userId)) {
    throw getError("You are not authorized to access this hotel booking", 403);
  }
  return booking;
};

const getPaymentState = (booking, transaction = null) => ({
  bookingRefNo: booking.bookingRefNo ?? null,
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
    booking.supplierBookingDetails?.crsPnr ??
    booking.supplierBookingResponse?.CRSPNR ??
    booking.supplierBookingResponse?.data?.CRSPNR ??
    null,
  supplierBookingDetails: booking.supplierBookingDetails ?? null,
  cancellationStatus: booking.cancellationStatus ?? "not_requested",
  cancellationId: booking.cancellationId ?? null,
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

const getOrderResponse = async (transaction, correlationId, bookingRefNo) => {
  const gateway = createHotelPaymentGateway(transaction.gateway);
  const checkout = await tracePaymentStep(
    correlationId,
    "order.load_gateway_checkout_details",
    {
      bookingId: String(transaction.bookingId),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
    },
    () => gateway.getCheckoutDetails(transaction, { correlationId })
  );
  return {
    bookingRefNo,
    transactionId: transaction.transactionId,
    gateway: transaction.gateway,
    paymentData: checkout,
  };
};

export const createHotelPaymentOrder = async ({
  bookingRefNo,
  userId,
  gateway: requestedGateway,
  correlationId = String(bookingRefNo),
}) => {
  const booking = await tracePaymentStep(
    correlationId,
    "order.load_booking",
    { bookingRefNo: correlationId },
    () => getOwnedBooking(bookingRefNo, userId)
  );
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

  const existing = await tracePaymentStep(
    correlationId,
    "order.find_pending_transaction",
    { bookingId: correlationId },
    () =>
      HotelPaymentTransaction.findOne({
        bookingId: booking._id,
        userId,
        status: "pending",
      }).sort({ createdAt: -1 })
  );
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
    return tracePaymentStep(
      correlationId,
      "order.rebuild_checkout_response",
      { bookingId: correlationId, gateway: existing.gateway },
      () => getOrderResponse(existing, correlationId, booking.bookingRefNo)
    );
  }

  const gatewayName = await tracePaymentStep(
    correlationId,
    "order.select_gateway",
    { bookingId: correlationId, currency },
    () =>
      getConfiguredGateway({
        gatewayName: requestedGateway,
        currency,
      })
  );
  const lock = await tracePaymentStep(
    correlationId,
    "order.acquire_booking_lock",
    { bookingId: correlationId, gateway: gatewayName },
    () =>
      HotelItinerary.findOneAndUpdate(
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
      )
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
    const order = await tracePaymentStep(
      correlationId,
      "order.call_gateway_create",
      { bookingId: correlationId, gateway: gatewayName, transactionId },
      () =>
        gateway.createOrder({
          amount,
          currency,
          bookingRefNo: booking.bookingRefNo,
          correlationId,
        })
    );
    const transaction = await tracePaymentStep(
      correlationId,
      "order.persist_transaction",
      { bookingId: correlationId, gateway: gatewayName, transactionId },
      () =>
        HotelPaymentTransaction.create({
          transactionId,
          bookingId: booking._id,
          userId,
          gateway: gatewayName,
          amount,
          currency,
          gatewayOrderId: order.gatewayOrderId,
          status: "pending",
        })
    );
    lock.paymentOrderStatus = "created";
    lock.paymentTransactionId = transaction.transactionId;
    await tracePaymentStep(
      correlationId,
      "order.persist_booking_order_status",
      { bookingId: correlationId, gateway: gatewayName, transactionId },
      () => lock.save()
    );

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
      bookingRefNo: booking.bookingRefNo,
      transactionId,
      gateway: gatewayName,
      paymentData: order.checkout,
    };
  } catch (error) {
    lock.paymentOrderStatus = "failed";
    lock.paymentGateway = null;
    await tracePaymentStep(
      correlationId,
      "order.release_booking_lock_after_failure",
      { bookingId: correlationId, gateway: gatewayName, transactionId },
      () => lock.save()
    );
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
  await tracePaymentStep(
    correlationId,
    "refund.persist_pending_state",
    {
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
    },
    () => Promise.all([booking.save(), transaction.save()])
  );

  const startedAt = performance.now();
  try {
    const gateway = createHotelPaymentGateway(transaction.gateway);
    const refund = await tracePaymentStep(
      correlationId,
      "refund.call_gateway",
      {
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        gateway: transaction.gateway,
      },
      () =>
        gateway.refundPayment({
          paymentId: transaction.gatewayPaymentId,
          amount: transaction.amount,
          correlationId,
        })
    );
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
    await tracePaymentStep(
      correlationId,
      "refund.persist_result",
      {
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        gateway: transaction.gateway,
        refundStatus: refund.status ?? "pending",
      },
      () => Promise.all([booking.save(), transaction.save()])
    );
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
    await tracePaymentStep(
      correlationId,
      "refund.persist_failure_state",
      {
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        gateway: transaction.gateway,
      },
      () => Promise.all([transaction.save(), booking.save()])
    );
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

const retrieveAndSaveAkbarBookingDetails = async ({
  booking,
  correlationId,
}) => {
  try {
    const response = await tracePaymentStep(
      correlationId,
      "supplier.retrieve_booking",
      {
        bookingId: String(booking._id),
        transactionId: String(booking.transactionId),
        supplier: "AKBAR",
      },
      () =>
        retrieveAkbarHotelBooking({
          transactionId: booking.transactionId,
          bookingId: booking._id,
          correlationId,
        })
    );
    const supplierData = getAkbarStartPayResponseData(response);
    const supplierCode = supplierData.Code ?? supplierData.code;
    if (supplierCode !== undefined && String(supplierCode) !== "200") {
      const message = supplierData.Msg ?? supplierData.Message ?? supplierData.message;
      throw new Error(
        Array.isArray(message)
          ? message.filter(Boolean).join("; ").slice(0, 300)
          : typeof message === "string" && message.trim()
            ? message.slice(0, 300)
            : `AKBAR RetrieveBooking returned code ${supplierCode}`
      );
    }

    const retrievedFields = getAkbarRetrievedBookingFields(response);
    if (Object.keys(retrievedFields).length === 0) {
      logGatewayEvent("error", "supplier_booking.retrieve_details_unrecognized", {
        correlationId,
        bookingId: String(booking._id),
        transactionId: String(booking.transactionId),
        supplier: "AKBAR",
        ...getSupplierResponseSummary(response),
      });
      return;
    }

    const fieldsToPersist = {
      ...Object.fromEntries(
        Object.entries(retrievedFields).map(([field, value]) => [
          `supplierBookingDetails.${field}`,
          value,
        ])
      ),
      "supplierBookingDetails.retrievedAt": new Date(),
    };
    await tracePaymentStep(
      correlationId,
      "supplier.persist_retrieved_booking_details",
      {
        bookingId: String(booking._id),
        transactionId: String(booking.transactionId),
        fieldsSaved: Object.keys(retrievedFields),
      },
      async () => {
        const savedBooking = await HotelItinerary.findOneAndUpdate(
          { _id: booking._id },
          { $set: fieldsToPersist },
          { new: true, runValidators: true }
        )
          .select("_id supplierBookingDetails")
          .lean();

        if (!savedBooking) {
          throw getError(
            "Hotel booking disappeared before retrieved details could be saved",
            404
          );
        }

        const fieldsPresent = Object.keys(retrievedFields).filter(
          (field) =>
            savedBooking.supplierBookingDetails?.[field] !== undefined
        );
        if (fieldsPresent.length !== Object.keys(retrievedFields).length) {
          throw new Error(
            "MongoDB did not persist all mapped AKBAR booking detail fields"
          );
        }

        return fieldsPresent;
      }
    );
    logGatewayEvent("info", "supplier_booking.details_retrieved", {
      correlationId,
      bookingId: String(booking._id),
      transactionId: String(booking.transactionId),
      supplier: "AKBAR",
      fieldsSaved: Object.keys(retrievedFields),
    });
  } catch (error) {
    logGatewayEvent("error", "supplier_booking.retrieve_details_failed", {
      correlationId,
      bookingId: String(booking._id),
      transactionId: String(booking.transactionId),
      supplier: "AKBAR",
      bookingRemainsConfirmed: booking.supplierBookingStatus === "confirmed",
      httpStatus: error.response?.status ?? null,
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
  }
};

const getAkbarCancellationReference = async ({ booking, correlationId }) => {
  let details = booking.supplierBookingDetails ?? {};
  if (details.tui && details.finYearId) return details;

  const response = await tracePaymentStep(
    correlationId,
    "cancellation.retrieve_booking",
    {
      bookingId: String(booking._id),
      transactionId: String(booking.transactionId),
      supplier: "AKBAR",
    },
    () =>
      retrieveAkbarHotelBooking({
        transactionId: booking.transactionId,
        bookingId: booking._id,
        correlationId,
      })
  );
  const supplierData = getAkbarStartPayResponseData(response);
  const supplierCode = supplierData.Code ?? supplierData.code;
  if (supplierCode !== undefined && String(supplierCode) !== "200") {
    throw getError("AKBAR could not retrieve the booking for cancellation", 502);
  }

  const retrievedFields = getAkbarRetrievedBookingFields(response);
  if (!retrievedFields.tui || !retrievedFields.finYearId) {
    throw getError(
      "AKBAR RetrieveBooking did not return TUI and FinYearID required for cancellation",
      502
    );
  }

  const fieldsToPersist = {
    ...Object.fromEntries(
      Object.entries(retrievedFields).map(([field, value]) => [
        `supplierBookingDetails.${field}`,
        value,
      ])
    ),
    "supplierBookingDetails.retrievedAt": new Date(),
  };
  const savedBooking = await tracePaymentStep(
    correlationId,
    "cancellation.persist_retrieve_booking_details",
    {
      bookingId: String(booking._id),
      transactionId: String(booking.transactionId),
      fieldsSaved: Object.keys(retrievedFields),
    },
    () =>
      HotelItinerary.findOneAndUpdate(
        { _id: booking._id, userId: booking.userId },
        { $set: fieldsToPersist },
        { new: true, runValidators: true }
      )
        .select("supplierBookingDetails")
        .lean()
  );
  if (!savedBooking?.supplierBookingDetails?.tui ||
      !savedBooking.supplierBookingDetails?.finYearId) {
    throw getError("Could not save AKBAR cancellation reference details", 500);
  }

  return savedBooking.supplierBookingDetails;
};

export const cancelHotelBooking = async ({
  bookingRefNo,
  userId,
  confirmCancellation,
  remarks,
  correlationId = randomUUID(),
}) => {
  if (confirmCancellation !== true) {
    throw getError(
      "Set confirmCancellation to true to confirm hotel cancellation",
      400
    );
  }
  const safeRemarks =
    typeof remarks === "string" && remarks.trim()
      ? remarks.trim().slice(0, 200)
      : "Customer requested cancellation";

  const booking = await tracePaymentStep(
    correlationId,
    "cancellation.load_booking",
    { bookingRefNo: String(bookingRefNo) },
    () => getOwnedBooking(bookingRefNo, userId)
  );
  if (
    booking.itineraryStatus !== "created" ||
    booking.paymentStatus !== "paid" ||
    booking.supplierBookingStatus !== "confirmed"
  ) {
    throw getError("Only a paid, confirmed hotel booking can be cancelled", 409);
  }
  if (booking.cancellationStatus === "cancelled") {
    throw getError("This hotel booking is already cancelled", 409);
  }

  const claimedBooking = await tracePaymentStep(
    correlationId,
    "cancellation.claim_booking",
    { bookingId: String(booking._id), supplier: "AKBAR" },
    () =>
      HotelItinerary.findOneAndUpdate(
        {
          _id: booking._id,
          userId,
          itineraryStatus: "created",
          paymentStatus: "paid",
          supplierBookingStatus: "confirmed",
          cancellationStatus: {
            $in: ["not_requested", "failed", null],
          },
          cancellationRequestSent: { $ne: true },
        },
        {
          $set: {
            cancellationStatus: "processing",
            cancellationRemarks: safeRemarks,
            cancellationError: null,
          },
        },
        { new: true }
      )
  );
  if (!claimedBooking) {
    throw getError(
      "Cancellation is already processing, completed, or has an uncertain supplier result",
      409
    );
  }

  try {
    const supplierDetails = await getAkbarCancellationReference({
      booking: claimedBooking,
      correlationId,
    });
    const response = await tracePaymentStep(
      correlationId,
      "cancellation.call_supplier",
      {
        bookingId: String(claimedBooking._id),
        transactionId: String(claimedBooking.transactionId),
        supplier: "AKBAR",
      },
      () =>
        cancelAkbarHotelBooking({
          transactionId: claimedBooking.transactionId,
          tui: supplierDetails.tui,
          finYearId: supplierDetails.finYearId,
          remarks: safeRemarks,
          bookingId: claimedBooking._id,
          correlationId,
        })
    );
    const supplierData = getAkbarCancelBookingResponseData(response);
    const supplierCode = supplierData.Code ?? supplierData.code;
    const rawMessage = supplierData.Msg ?? supplierData.Message ?? supplierData.message;
    const supplierMessage = Array.isArray(rawMessage)
      ? rawMessage.filter(Boolean).join("; ").slice(0, 300)
      : typeof rawMessage === "string"
        ? rawMessage.slice(0, 300)
        : null;
    const cancellationId =
      supplierData.CancellationID ??
      supplierData.CancellationId ??
      supplierData.CancelID ??
      null;
    const cancelled = String(supplierCode) === "200";
    const finalStatus =
      supplierCode === undefined || supplierCode === null
        ? "unknown"
        : cancelled
          ? "cancelled"
          : "failed";

    await tracePaymentStep(
      correlationId,
      "cancellation.persist_supplier_result",
      {
        bookingId: String(claimedBooking._id),
        transactionId: String(claimedBooking.transactionId),
        supplierCode: supplierCode ?? null,
        finalStatus,
      },
      () =>
        HotelItinerary.findOneAndUpdate(
          { _id: claimedBooking._id, userId },
          {
            $set: {
              cancellationStatus: finalStatus,
              cancellationRequestSent: true,
              cancellationId: cancellationId
                ? String(cancellationId)
                : null,
              cancellationError:
                finalStatus === "failed"
                  ? supplierMessage ?? "AKBAR rejected the cancellation"
                  : null,
              ...(cancelled ? { cancelledAt: new Date() } : {}),
            },
          },
          { new: true, runValidators: true }
        )
    );
    logGatewayEvent(
      cancelled ? "info" : finalStatus === "failed" ? "error" : "warn",
      `cancellation.${finalStatus}`,
      {
        correlationId,
        bookingId: String(claimedBooking._id),
        transactionId: String(claimedBooking.transactionId),
        supplier: "AKBAR",
        supplierCode: supplierCode ?? null,
        supplierMessage,
        cancellationId: cancellationId ? String(cancellationId) : null,
      }
    );
    return {
      bookingRefNo: claimedBooking.bookingRefNo ?? null,
      cancellationStatus: finalStatus,
      cancellationId: cancellationId ? String(cancellationId) : null,
      message:
        supplierMessage ??
        (cancelled
          ? "Hotel booking cancellation confirmed"
          : "AKBAR cancellation result requires checking"),
    };
  } catch (error) {
    const requestMayHaveReachedSupplier =
      error.supplierRequestSent === true ||
      Boolean(error.response) ||
      error.supplierRequestSent === undefined;
    const finalStatus = requestMayHaveReachedSupplier ? "unknown" : "failed";
    await tracePaymentStep(
      correlationId,
      "cancellation.persist_error_state",
      {
        bookingId: String(claimedBooking._id),
        transactionId: String(claimedBooking.transactionId),
        finalStatus,
      },
      () =>
        HotelItinerary.findOneAndUpdate(
          { _id: claimedBooking._id, userId },
          {
            $set: {
              cancellationStatus: finalStatus,
              cancellationRequestSent: requestMayHaveReachedSupplier,
              cancellationError: error.message,
            },
          },
          { runValidators: true }
        )
    );
    logGatewayEvent("error", `cancellation.${finalStatus}`, {
      correlationId,
      bookingId: String(claimedBooking._id),
      transactionId: String(claimedBooking.transactionId),
      supplier: "AKBAR",
      httpStatus: error.response?.status ?? null,
      errorCode: error.code ?? null,
      errorMessage: error.message,
      requestMayHaveReachedSupplier,
    });
    throw error;
  }
};

const startSupplierBooking = async ({
  booking,
  transaction,
  correlationId = String(booking._id),
}) => {
  const claimedBooking = await tracePaymentStep(
    correlationId,
    "supplier.claim_booking",
    {
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
      supplier: "AKBAR",
    },
    () =>
      HotelItinerary.findOneAndUpdate(
        {
          _id: booking._id,
          paymentStatus: "paid",
          supplierBookingStatus: { $in: ["awaiting_payment", null] },
          paymentTransactionId: transaction.transactionId,
        },
        { $set: { supplierBookingStatus: "processing" } },
        { returnDocument: "after" }
      )
  );
  if (!claimedBooking) {
    const latestBooking = await tracePaymentStep(
      correlationId,
      "supplier.load_latest_booking_after_claim_miss",
      { bookingId: String(booking._id), transactionId: transaction.transactionId },
      () => HotelItinerary.findById(booking._id)
    );
    if (!latestBooking) {
      throw getError("Hotel booking was not found", 404);
    }
    return getPaymentState(latestBooking, transaction);
  }

  transaction.supplierBookingStatus = "processing";
  await tracePaymentStep(
    correlationId,
    "supplier.persist_processing_state",
    {
      bookingId: String(booking._id),
      transactionId: transaction.transactionId,
    },
    () => transaction.save()
  );
  logGatewayEvent("info", "supplier_booking.started", {
    correlationId,
    bookingId: String(booking._id),
    transactionId: transaction.transactionId,
    gateway: transaction.gateway,
    supplier: "AKBAR",
  });

  const startedAt = performance.now();
  try {
    const supplierResponse = await tracePaymentStep(
      correlationId,
      "supplier.startpay",
      {
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        supplier: "AKBAR",
      },
      () =>
        startAkbarHotelPay({
          booking: claimedBooking,
          correlationId,
        })
    );
    const supplierData = getAkbarStartPayResponseData(supplierResponse);
    const supplierCode = supplierData.Code ?? supplierData.code;
    const rawMessage = supplierData.Msg ?? supplierData.Message ?? supplierData.message;
    const supplierMessage = Array.isArray(rawMessage)
      ? rawMessage.filter(Boolean).join("; ").slice(0, 300)
      : typeof rawMessage === "string"
        ? rawMessage.slice(0, 300)
        : null;
    if (supplierCode === undefined || supplierCode === null) {
      claimedBooking.supplierBookingStatus = "unknown";
      claimedBooking.supplierBookingError =
        "AKBAR StartPay returned a response without a status code";
      transaction.supplierBookingStatus = "unknown";
      transaction.lastError = claimedBooking.supplierBookingError;
      await tracePaymentStep(
        correlationId,
        "supplier.persist_unrecognized_response",
        {
          bookingId: String(booking._id),
          transactionId: transaction.transactionId,
        },
        () => Promise.all([claimedBooking.save(), transaction.save()])
      );
      logGatewayEvent("error", "supplier_booking.response_unrecognized", {
        correlationId,
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        gateway: transaction.gateway,
        supplier: "AKBAR",
        durationMs: Math.round(performance.now() - startedAt),
        ...getSupplierResponseSummary(supplierResponse),
      });
      return getPaymentState(claimedBooking, transaction);
    }

    if (String(supplierCode) !== "200") {
      claimedBooking.supplierBookingStatus = "failed";
      claimedBooking.supplierBookingError =
        supplierMessage ?? "AKBAR rejected the booking payment";
      transaction.supplierBookingStatus = "failed";
      transaction.lastError = claimedBooking.supplierBookingError;
      await tracePaymentStep(
        correlationId,
        "supplier.persist_rejected_response",
        {
          bookingId: String(booking._id),
          transactionId: transaction.transactionId,
          supplierCode,
        },
        () => Promise.all([claimedBooking.save(), transaction.save()])
      );
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
    const startPayDetails = {
      ...(supplierData.CRSPNR == null
        ? {}
        : { crsPnr: String(supplierData.CRSPNR) }),
      ...(supplierData.BookStatus == null
        ? {}
        : { bookingStatus: String(supplierData.BookStatus) }),
    };
    claimedBooking.supplierBookingDetails =
      Object.keys(startPayDetails).length > 0 ? startPayDetails : undefined;
    await tracePaymentStep(
      correlationId,
      "supplier.persist_confirmation",
      {
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
      },
      () => Promise.all([claimedBooking.save(), transaction.save()])
    );
    await retrieveAndSaveAkbarBookingDetails({
      booking: claimedBooking,
      correlationId,
    });
    await emailHotelBookingConfirmation({
      booking: claimedBooking,
      correlationId,
    });
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
    await tracePaymentStep(
      correlationId,
      "supplier.persist_failure_state",
      {
        bookingId: String(booking._id),
        transactionId: transaction.transactionId,
        finalState: claimedBooking.supplierBookingStatus,
      },
      () => Promise.all([claimedBooking.save(), transaction.save()])
    );
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

const recordCapturedPayment = async ({
  transaction,
  gatewayPaymentId,
  correlationId = String(transaction.bookingId),
}) => {
  if (transaction.status === "refunded" || transaction.status === "refund_pending") {
    const booking = await tracePaymentStep(
      correlationId,
      "payment.load_booking_for_refund_state",
      {
        bookingId: String(transaction.bookingId),
        transactionId: transaction.transactionId,
      },
      () => HotelItinerary.findById(transaction.bookingId)
    );
    if (!booking) throw getError("Hotel booking was not found", 404);
    return getPaymentState(booking, transaction);
  }

  transaction.status = "success";
  transaction.gatewayPaymentId = gatewayPaymentId;
  await tracePaymentStep(
    correlationId,
    "payment.persist_captured_transaction",
    {
      bookingId: String(transaction.bookingId),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
    },
    () => transaction.save()
  );
  const booking = await tracePaymentStep(
    correlationId,
    "payment.load_booking_after_capture",
    {
      bookingId: String(transaction.bookingId),
      transactionId: transaction.transactionId,
    },
    () => HotelItinerary.findById(transaction.bookingId)
  );
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
    await tracePaymentStep(
      correlationId,
      "payment.persist_booking_paid_state",
      {
        bookingId: String(transaction.bookingId),
        transactionId: transaction.transactionId,
      },
      () => booking.save()
    );
  }
  return tracePaymentStep(
    correlationId,
    "payment.confirm_supplier_booking",
    {
      bookingId: String(transaction.bookingId),
      transactionId: transaction.transactionId,
      gateway: transaction.gateway,
    },
    () => startSupplierBooking({ booking, transaction, correlationId })
  );
};

export const verifyHotelPayment = async ({
  transactionId,
  gatewayOrderId,
  paymentId,
  signature,
  gatewayName,
  userId,
  correlationId = randomUUID(),
}) => {
  const transaction = await tracePaymentStep(
    correlationId,
    "verification.load_transaction",
    { transactionId },
    () => HotelPaymentTransaction.findOne({ transactionId, userId })
  );
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
    const verification = await tracePaymentStep(
      correlationId,
      "verification.call_gateway",
      {
        bookingId: String(transaction.bookingId),
        transactionId,
        gateway: transaction.gateway,
      },
      () =>
        gateway.verifyPayment({
          gatewayOrderId: transaction.gatewayOrderId,
          paymentId,
          signature,
          expectedAmount: transaction.amount,
          expectedCurrency: transaction.currency,
          correlationId,
        })
    );
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
      correlationId,
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

export const getHotelPaymentStatus = async ({
  bookingRefNo,
  userId,
  correlationId = randomUUID(),
}) => {
  const booking = await tracePaymentStep(
    correlationId,
    "status.load_booking",
    { bookingRefNo: String(bookingRefNo) },
    () => getOwnedBooking(bookingRefNo, userId)
  );
  const transaction = booking.paymentTransactionId
    ? await tracePaymentStep(
        correlationId,
        "status.load_transaction",
        {
          bookingId: String(booking._id),
          transactionId: booking.paymentTransactionId,
        },
        () =>
          HotelPaymentTransaction.findOne({
            transactionId: booking.paymentTransactionId,
          })
      )
    : null;
  return getPaymentState(booking, transaction);
};

export const handleHotelPaymentWebhook = async ({
  gatewayName,
  gatewayOrderId,
  gatewayPaymentId,
  gatewayAmount,
  gatewayCurrency,
  correlationId = randomUUID(),
}) => {
  const transaction = await tracePaymentStep(
    correlationId,
    "webhook.load_transaction",
    { gateway: gatewayName },
    () =>
      HotelPaymentTransaction.findOne({
        gateway: gatewayName,
        gatewayOrderId,
      })
  );
  if (!transaction) {
    throw getError("Hotel payment transaction for gateway order was not found", 404);
  }
  if (
    gatewayAmount !== Math.round(transaction.amount * 100) ||
    String(gatewayCurrency).toUpperCase() !== transaction.currency
  ) {
    throw getError("Webhook payment amount or currency does not match the order", 400);
  }
  return recordCapturedPayment({
    transaction,
    gatewayPaymentId,
    correlationId,
  });
};

export const handleHotelPaymentRefundWebhook = async ({
  gatewayName,
  gatewayPaymentId,
  refundId,
  refundStatus,
  refundAmount,
  correlationId = randomUUID(),
}) => {
  const transaction = await tracePaymentStep(
    correlationId,
    "refund_webhook.load_transaction",
    { gateway: gatewayName },
    () =>
      HotelPaymentTransaction.findOne({
        gateway: gatewayName,
        gatewayPaymentId,
      })
  );
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
  await tracePaymentStep(
    correlationId,
    "refund_webhook.persist_refunded_state",
    {
      bookingId: String(transaction.bookingId),
      transactionId: transaction.transactionId,
      gateway: gatewayName,
    },
    async () => {
      await transaction.save();
      await HotelItinerary.findByIdAndUpdate(transaction.bookingId, {
        $set: { paymentStatus: "refunded" },
      });
    }
  );
  logGatewayEvent("info", "refund.webhook_processed", {
    correlationId,
    bookingId: String(transaction.bookingId),
    transactionId: transaction.transactionId,
    gateway: gatewayName,
    refundStatus,
  });
};
