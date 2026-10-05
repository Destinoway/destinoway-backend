
import mongoose from "mongoose";

const hotelSearchHotelSchema = new mongoose.Schema(
  {
    hotelId: {
      type: String,
      required: true,
    },

    hotelKey: {
      type: String,
      required: true,
    },

    name: String,

    description: String,

    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
      latitude: Number,
      longitude: Number,
    },

    contact: {
      phone: String,
      email: String,
    },

    image: String,

    starCategory: Number,

    facilities: [
      {
        id: String,
        name: String,
      },
    ],

    pricing: {
      currency: String,
      basicAmount: Number,
      tax: Number,
      totalAmount: Number,
      serviceFee: Number,
      markup: Number,
      gst: Number,
    },

    checkIn: {
      date: String,
      time: String,
    },

    checkOut: {
      date: String,
      time: String,
    },

    policy: {
      applicableCode: String,
      state: String,
      outPolicyReason: String,
    },

    supplier: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);


// ============================================================
// ROOT HOTEL SEARCH SCHEMA
// ============================================================

const hotelSearchSchema = new mongoose.Schema(
  {
    // IMPORTANT:
    // hotelDetailId is ROOT LEVEL ONLY

    hotelDetailId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    searchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    searchKey: {
      type: String,
      default: null,
    },

    supplier: {
      type: String,
      required: true,
      index: true,
    },

    destination: {
      type: String,
      index: true,
    },

    checkIn: Date,

    checkOut: Date,

    rooms: mongoose.Schema.Types.Mixed,

    hotels: [
      hotelSearchHotelSchema,
    ],

    totalHotels: {
      type: Number,
      default: 0,
    },

    cacheKey: {
      type: String,
      index: true,
    },

    moreHotels: {
      type: Boolean,
      default: false,
    },

    responseStatus: {
      type: String,
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: {
        expireAfterSeconds: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);


// ============================================================
// DO NOT ADD ANOTHER expiresAt INDEX
// ============================================================


// ============================================================
// DEBUG - CHECK RUNTIME SCHEMA
// ============================================================

console.log(
  "ROOT hotelDetailId:",
  hotelSearchSchema.path(
    "hotelDetailId"
  )?.options
);

console.log(
  "NESTED hotels.hotelDetailId:",
  hotelSearchSchema
    .path("hotels")
    ?.schema
    ?.path("hotelDetailId")
);
// ============================================================
// DEBUG - CHECK RUNTIME SCHEMA
// ============================================================

console.log(
  "========== HOTEL SEARCH MODEL DEBUG =========="
);

console.log(
  "ROOT hotelDetailId:",
  hotelSearchSchema.path("hotelDetailId")?.options
);

console.log(
  "NESTED hotels.hotelDetailId:",
  hotelSearchSchema
    .path("hotels")
    ?.schema
    ?.path("hotelDetailId")
);

console.log(
  "ROOT PATHS:",
  Object.keys(hotelSearchSchema.paths)
);

console.log(
  "NESTED HOTEL PATHS:",
  Object.keys(
    hotelSearchSchema.path("hotels").schema.paths
  )
);

console.log(
  "=============================================="
);

// ============================================================
// MODEL
// ============================================================

export default mongoose.model(
  "HotelSearch",
  hotelSearchSchema
);