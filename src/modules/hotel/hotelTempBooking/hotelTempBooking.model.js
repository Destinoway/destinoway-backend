import mongoose from "mongoose";

const OccupantSchema = new mongoose.Schema(
  {
    OccupantID: Number,
    FirstName: String,
    LastName: String,
    OccupantType: String,
    RoomNo: Number,
    Title: String,
  },
  { _id: false },
);


const HotelTempBookingSchema = new mongoose.Schema(
  {
    requestPayload: mongoose.Schema.Types.Mixed,
    responsePayload: mongoose.Schema.Types.Mixed,

    // Requery Response
    hotelRequeryResponse: mongoose.Schema.Types.Mixed,

    voucherNumber: String,
    invoiceNumber: String,

    ticketStatusId: String,
    ticketStatusDesc: String,

    checkInDate: String,
    checkOutDate: String,

    requeryAt: Date,
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "FAILED",
    },

    hotelKey: String,
    recommendationId: String,
    customerMobile: String,

    errorMessage: String,
  },
  { timestamps: true },
);

export default mongoose.model("HotelTempBooking", HotelTempBookingSchema);
