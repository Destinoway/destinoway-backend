import mongoose from "mongoose";
import { randomInt } from "node:crypto";

export const generateHotelBookingRefNo = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const randomNumber = String(randomInt(10_000_000, 100_000_000));

  return `DW-${year}-${month}-${randomNumber}`;
};

const hotelItinerarySchema = new mongoose.Schema(
  {
    bookingRefNo: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    searchId: {
      type: String,
      required: true,
      index: true,
    },
    supplierSearchId: {
      type: String,
      required: true,
    },
    hotelId: {
      type: String,
      required: true,
    },
    recommendationId: {
      type: String,
      required: true,
    },
    supplier: {
      type: String,
      default: "AKBAR",
    },
    hotel: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    stay: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    contactInfo: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    rooms: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
    supplierRooms: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
    price: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    specialServiceRequest: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      default: null,
      index: true,
    },
    itineraryStatus: {
      type: String,
      enum: ["processing", "created", "failed"],
      default: "processing",
      index: true,
    },
    itineraryResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    itineraryError: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refund_pending", "refunded"],
      default: "pending",
      index: true,
    },
    paymentOrderStatus: {
      type: String,
      enum: ["idle", "creating", "created", "failed"],
      default: "idle",
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", null],
      default: null,
    },
    paymentTransactionId: {
      type: String,
      default: null,
      index: true,
    },
    supplierBookingStatus: {
      type: String,
      enum: ["awaiting_payment", "processing", "confirmed", "failed", "unknown"],
      default: "awaiting_payment",
      index: true,
    },
    supplierBookingResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    supplierBookingDetails: {
      tui: { type: String },
      finYearId: { type: String },
      crsPnr: { type: String },
      bookingStatus: { type: String },
      bookingConfirmationId: { type: String },
      confirmationNumber: { type: String },
      voucherNumber: { type: String },
      retrievedAt: { type: Date },
    },
    cancellationStatus: {
      type: String,
      enum: ["not_requested", "processing", "cancelled", "failed", "unknown"],
      default: "not_requested",
      index: true,
    },
    cancellationRequestSent: {
      type: Boolean,
      default: false,
    },
    cancellationRemarks: {
      type: String,
      default: null,
    },
    cancellationId: {
      type: String,
      default: null,
    },
    cancellationError: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    supplierBookingError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("HotelItinerary", hotelItinerarySchema);
