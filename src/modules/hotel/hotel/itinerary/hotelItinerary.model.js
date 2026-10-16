import mongoose from "mongoose";

const hotelItinerarySchema = new mongoose.Schema(
  {
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
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("HotelItinerary", hotelItinerarySchema);
