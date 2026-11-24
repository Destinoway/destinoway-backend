import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import BusBooking from "./busBooking.model.js";
import { startAkbarBusPay } from "./adapters/akbar/startPay.api.js";
import { getAkbarBookedBusItinerary } from "./adapters/akbar/getBusItinerary.api.js";

const fail = (message, statusCode = 409) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const gateway = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) fail("Razorpay is not configured", 503);
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

const minorUnits = (amount) => Math.round(Number(amount) * 100);
const state = (booking) => ({
  bookingId: String(booking._id),
  busServiceId: booking.busServiceId,
  amount: booking.customerAmount,
  currency: booking.currency,
  paymentStatus: booking.paymentStatus,
  supplierStatus: booking.supplierStatus,
  supplierBookStatus: booking.supplierBookStatus,
  supplierPnr: booking.supplierPnr,
  ticketNumber: booking.ticketNumber,
  bookingReferenceNo: booking.bookingReferenceNo,
  refundId: booking.refundId,
});

const getOwned = async (bookingId, userId) => {
  const booking = await BusBooking.findOne({ _id: bookingId, userId });
  if (!booking) fail("Bus booking not found", 404);
  return booking;
};

export const createBusPaymentOrder = async ({ bookingId, userId }) => {
  if (process.env.AKBAR_BUS_PAYMENTS_ENABLED !== "true") fail("Bus payments are not enabled", 503);
  if (!process.env.AKBAR_BUS_BROWSER_KEY || !process.env.RAZORPAY_WEBHOOK_SECRET) fail("Bus payment configuration is incomplete", 503);
  if (!Number.isSafeInteger(Number(process.env.AKBAR_BUS_FYEAR_ID)) || Number(process.env.AKBAR_BUS_FYEAR_ID) <= 0) fail("AKBAR_BUS_FYEAR_ID is not configured", 503);
  const booking = await getOwned(bookingId, userId);
  if (Date.now() - booking.createdAt.getTime() > 10 * 60 * 1000) fail("Bus itinerary has expired; search and select the bus again");
  if (booking.paymentStatus === "order_created" && booking.razorpayOrderId) {
    return { ...state(booking), checkout: { keyId: process.env.RAZORPAY_KEY_ID, orderId: booking.razorpayOrderId, amount: minorUnits(booking.customerAmount), currency: "INR" } };
  }
  if (booking.paymentStatus !== "unpaid") fail("Bus payment order is already being processed");

  const claimed = await BusBooking.findOneAndUpdate(
    { _id: booking._id, userId, paymentStatus: "unpaid", supplierStatus: "not_started" },
    { $set: { paymentStatus: "order_creating" } },
    { returnDocument: "after" },
  );
  if (!claimed) fail("Bus payment order is already being created");

  try {
    const order = await gateway().orders.create({
      amount: minorUnits(claimed.customerAmount),
      currency: "INR",
      receipt: String(claimed._id),
      notes: { module: "bus", busBookingId: String(claimed._id), busServiceId: claimed.busServiceId },
    });
    claimed.razorpayOrderId = order.id;
    claimed.paymentStatus = "order_created";
    await claimed.save();
    return { ...state(claimed), checkout: { keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency } };
  } catch (error) {
    // An order may exist remotely if persistence failed. Keep the lock in that
    // case, so a retry cannot create an untracked second order.
    if (!claimed.razorpayOrderId) {
      await BusBooking.updateOne({ _id: claimed._id, paymentStatus: "order_creating" }, { $set: { paymentStatus: "unpaid" } });
    }
    throw error;
  }
};

const refundDefinitiveFailure = async (booking) => {
  booking.paymentStatus = "refund_pending";
  await booking.save();
  try {
    const refund = await gateway().payments.refund(booking.razorpayPaymentId, { amount: minorUnits(booking.customerAmount) });
    booking.refundId = refund.id;
    await booking.save();
  } catch (error) {
    booking.lastError = `Refund pending: ${error.message}`;
    await booking.save();
  }
};

const reconcileTicket = async (booking) => {
  try {
    const itinerary = await getAkbarBookedBusItinerary(booking);
    const onward = itinerary.busDomItineraryBus?.busDomItineraryOnward?.[0]?.busDomTrvItiResBusDetails;
    const passenger = itinerary.busDomItineraryPassengers?.[0];
    if (passenger?.ticketNumber && onward?.bookingReferenceNo) {
      booking.ticketNumber = String(passenger.ticketNumber);
      booking.bookingReferenceNo = String(onward.bookingReferenceNo);
      booking.supplierStatus = "confirmed";
      booking.lastError = null;
    }
  } catch (error) {
    booking.lastError = `Ticket lookup pending: ${error.message}`;
  }
  await booking.save();
  return state(booking);
};

const completeCapturedPayment = async (booking, paymentId) => {
  if (booking.razorpayPaymentId && booking.razorpayPaymentId !== paymentId) {
    fail("A different captured payment is linked to this bus booking");
  }
  if (booking.paymentStatus !== "captured") {
    const updated = await BusBooking.updateOne(
      { _id: booking._id, paymentStatus: "order_created", razorpayPaymentId: null },
      { $set: { paymentStatus: "captured", razorpayPaymentId: paymentId } },
    );
    if (!updated.modifiedCount) {
      const latest = await BusBooking.findById(booking._id);
      if (latest.razorpayPaymentId !== paymentId) fail("A different payment was recorded for this bus booking");
    }
  }

  const claimed = await BusBooking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: "captured", supplierStatus: "not_started" },
    { $set: { supplierStatus: "processing" } },
    { returnDocument: "after" },
  );
  if (!claimed) return state(await BusBooking.findById(booking._id));

  try {
    const response = await startAkbarBusPay(claimed);
    claimed.supplierCode = String(response?.code ?? "");
    claimed.supplierBookStatus = response?.bookStatus ?? null;
    claimed.supplierPnr = response?.crspnr ?? null;
    if (!response?.code && response?.code !== 0) {
      claimed.supplierStatus = "unknown";
      claimed.lastError = "AKBAR StartPay returned no status code";
      await claimed.save();
    } else if (claimed.supplierCode === "200") {
      // BO0 is not documented as final ticket confirmation.
      claimed.supplierStatus = "pending_confirmation";
      await claimed.save();
      await reconcileTicket(claimed);
    } else {
      claimed.supplierStatus = "failed";
      claimed.lastError = Array.isArray(response?.msg) ? response.msg.join(", ") : String(response?.msg || "AKBAR rejected StartPay");
      await refundDefinitiveFailure(claimed);
    }
  } catch (error) {
    // A timeout or transport error can occur after AKBAR processes StartPay.
    // Reconciliation is required before a refund or another StartPay call.
    claimed.supplierStatus = "unknown";
    claimed.lastError = error.message;
    await claimed.save();
  }
  return state(claimed);
};

export const verifyBusPayment = async ({ bookingId, userId, orderId, paymentId, signature }) => {
  const booking = await getOwned(bookingId, userId);
  gateway();
  if (booking.razorpayOrderId !== orderId || !orderId) fail("Payment order does not match this bus booking", 400);
  if (typeof paymentId !== "string" || typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) fail("Invalid payment verification fields", 400);
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
  const supplied = Buffer.from(signature, "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) fail("Invalid payment signature", 400);
  const payment = await gateway().payments.fetch(paymentId);
  if (payment.order_id !== orderId || payment.status !== "captured" || payment.amount !== minorUnits(booking.customerAmount) || payment.currency !== "INR") fail("Captured payment does not match bus order", 400);
  return completeCapturedPayment(booking, paymentId);
};

export const handleBusPaymentCapturedWebhook = async (payment) => {
  const booking = await BusBooking.findOne({ razorpayOrderId: payment.order_id });
  if (!booking) return;
  if (payment.status !== "captured" || payment.amount !== minorUnits(booking.customerAmount) || payment.currency !== "INR") return;
  await completeCapturedPayment(booking, payment.id);
};

export const handleBusRefundProcessedWebhook = async (refund) => {
  const booking = await BusBooking.findOne({ razorpayPaymentId: refund.payment_id });
  if (!booking || booking.paymentStatus !== "refund_pending") return;
  if (refund.amount !== minorUnits(booking.customerAmount)) return;
  await BusBooking.updateOne(
    { _id: booking._id, paymentStatus: "refund_pending" },
    { $set: { paymentStatus: "refunded", refundId: refund.id } },
  );
};

export const getBusPaymentStatus = async ({ bookingId, userId }) => state(await getOwned(bookingId, userId));

export const reconcileBusPayment = async ({ bookingId, userId }) => {
  const booking = await getOwned(bookingId, userId);
  if (booking.paymentStatus !== "captured" || !["pending_confirmation", "confirmed"].includes(booking.supplierStatus)) fail("Bus booking is not ready for ticket lookup");
  if (booking.supplierStatus === "confirmed") return state(booking);
  return reconcileTicket(booking);
};
