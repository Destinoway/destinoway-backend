import mongoose from "mongoose";

const paxDetailsSchema = new mongoose.Schema(
  {
    employeeID: {
      type: String,
      default: null,
    },

    firstName: {
      type: String,
      default: null,
    },

    lastName: {
      type: String,
      default: null,
    },

    passengerTyp: {
      type: String,
      default: null,
    },

    roomNo: {
      type: String,
      default: null,
    },

    title: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const locationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      default: null,
    },

    city: {
      type: String,
      default: null,
    },

    state: {
      type: String,
      default: null,
    },

    country: {
      type: String,
      default: null,
    },

    pincode: {
      type: String,
      default: null,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const checkInOutSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      default: null,
    },

    time: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const policySchema = new mongoose.Schema(
  {
    applicableCode: {
      type: String,
      default: null,
    },

    state: {
      type: String,
      default: null,
    },

    outPolicyReason: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const pricingSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      default: null,
    },

    basicAmount: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    serviceFee: {
      type: Number,
      default: 0,
    },

    markup: {
      type: Number,
      default: 0,
    },

    gst: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const responseHeaderSchema = new mongoose.Schema(
  {
    errorCode: {
      type: String,
      default: null,
    },

    errorDesc: {
      type: String,
      default: null,
    },

    errorInnerException: {
      type: String,
      default: null,
    },

    statusId: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const supplierResponseSchema = new mongoose.Schema(
  {
    bookingRefNo: {
      type: String,
      default: null,
    },

    isPriceChanged: {
      type: Boolean,
      default: false,
    },

    responseHeader: {
      type: responseHeaderSchema,
      default: null,
    },

    revisedFare: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const tempBookingSchema = new mongoose.Schema(
  {
    // ==========================================================
    // HOTEL / ROOM REFERENCE
    // ==========================================================

    hotelDetailId: {
      type: String,
      required: true,
      index: true,
    },

    hotelId: {
      type: String,
      required: true,
      index: true,
    },

    roomId: {
      type: String,
      required: true,
      index: true,
    },

    // ==========================================================
    // SUPPLIER DATA
    // ==========================================================

    hotelKey: {
      type: String,
      required: true,
    },

    searchKey: {
      type: String,
      required: true,
    },

    ratePlanId: {
      type: String,
      required: true,
    },

    // ==========================================================
    // HOTEL DETAILS
    // ==========================================================

    hotelName: {
      type: String,
      default: null,
    },

    hotelLocation: {
      type: locationSchema,
      default: null,
    },

    hotelStarCategory: {
      type: Number,
      default: null,
    },

    hotelCheckIn: {
      type: checkInOutSchema,
      default: null,
    },

    hotelCheckOut: {
      type: checkInOutSchema,
      default: null,
    },

    hotelPolicy: {
      type: policySchema,
      default: null,
    },

    // ==========================================================
    // ROOM DETAILS
    // ==========================================================

    roomType: {
      type: String,
      default: null,
    },

    roomTypeId: {
      type: String,
      default: null,
    },

    inclusion: {
      type: String,
      default: null,
    },

    additionalInfo: {
      type: String,
      default: null,
    },

    pricing: {
      type: pricingSchema,
      default: null,
    },

    cancellationPolicy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    cancellationCharges: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    payment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ==========================================================
    // CUSTOMER DETAILS
    // ==========================================================

    customerAddress: {
      type: String,
      default: null,
    },

    customerMobile: {
      type: String,
      default: null,
    },

    customerPostalCode: {
      type: String,
      default: null,
    },

    passengerEmail: {
      type: String,
      default: null,
    },

    passengerMobile: {
      type: String,
      default: null,
    },

    remarks: {
      type: String,
      default: null,
    },

    specialRequestRemarks: {
      type: String,
      default: null,
    },

    panNumber: {
      type: String,
      default: null,
    },

    paxDetails: {
      type: [paxDetailsSchema],
      default: [],
    },

    // ==========================================================
    // SUPPLIER RESPONSE
    // ==========================================================

    supplierResponse: {
      type: supplierResponseSchema,
      default: null,
    },

    // ==========================================================
    // BOOKING STATUS
    // ==========================================================

    status: {
      type: String,
      enum: [
        "PENDING",
        "TEMP_BOOKED",
        "PRICE_CHANGED",
        "FAILED",
      ],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

tempBookingSchema.index({
  hotelDetailId: 1,
  roomId: 1,
});

const TempBooking = mongoose.model(
  "TempBooking",
  tempBookingSchema
);

export default TempBooking;