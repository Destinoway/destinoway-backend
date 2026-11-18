import mongoose from "mongoose";

const hotelPaymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelItinerary",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      enum: ["razorpay", "stripe"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    gatewayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    gatewayPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refund_pending", "refunded"],
      default: "pending",
      index: true,
    },
    supplierBookingStatus: {
      type: String,
      enum: ["not_started", "processing", "confirmed", "failed", "unknown"],
      default: "not_started",
    },
    refundId: {
      type: String,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

hotelPaymentTransactionSchema.index(
  { bookingId: 1, gateway: 1, status: 1 },
  { name: "hotel_payment_booking_gateway_status" }
);

export default mongoose.model(
  "HotelPaymentTransaction",
  hotelPaymentTransactionSchema
);
