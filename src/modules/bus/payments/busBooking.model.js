import mongoose from "mongoose";

const busBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  supplierTransactionId: { type: String, required: true, unique: true },
  tui: { type: String, required: true },
  busServiceId: { type: String, required: true },
  providerCode: { type: String, required: true },
  seatName: { type: String, required: true },
  journeyDate: { type: String, required: true },
  buid: { type: String, required: true },
  duid: { type: String, required: true },
  passenger: { type: mongoose.Schema.Types.Mixed, required: true },
  contact: { type: mongoose.Schema.Types.Mixed, required: true },
  customerAmount: { type: Number, required: true, min: 0.01 },
  supplierNetAmount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: "INR" },
  paymentStatus: { type: String, enum: ["unpaid", "order_creating", "order_created", "captured", "refund_pending", "refunded"], default: "unpaid" },
  supplierStatus: { type: String, enum: ["not_started", "processing", "pending_confirmation", "failed", "unknown", "confirmed"], default: "not_started" },
  razorpayOrderId: { type: String, default: null, index: true },
  razorpayPaymentId: { type: String, default: null },
  refundId: { type: String, default: null },
  supplierCode: { type: String, default: null },
  supplierBookStatus: { type: String, default: null },
  supplierPnr: { type: String, default: null },
  ticketNumber: { type: String, default: null },
  bookingReferenceNo: { type: String, default: null },
  lastError: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("BusBooking", busBookingSchema);
