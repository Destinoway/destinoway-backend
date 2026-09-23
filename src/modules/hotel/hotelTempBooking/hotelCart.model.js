import mongoose from "mongoose";

const hotelCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    supplier: {
      type: String,
      default: "TBO",
    },

    // supplier booking required data
   supplierData: {
  hotelKey: String,
  recommendationId: String,
  searchKey: String,

  customerName: String,
  customerMobile: String,
  customerAddress: String,
  customerPostalCode: String,

  OccupantEmail: String,
  OccupantMobile: String,

  occupantDetails: [
    {
      OccupantID: Number,
      FirstName: String,
      LastName: String,
      OccupantType: String,
      RoomNo: Number,
      Title: String,
      OccupantEmail: String,
      OccupantMobile: String,
    },
  ],
},
    hotelData: {
      hotelImage: String,
    },

    // IMPORTANT pricing breakdown
    pricing: {
      serviceCharge: Number,
      platformFeeAndTax: Number,
      finalPrice: Number,
      currencySymbol: {
        type: String,
        default: "₹",
      },
      currency:
      {
        type: String,
        default: "INR",
      },
    },

    // offer engine
    offer: {
      autoCouponCode: {
        type: String,
        default: null,
      },

      autoDiscount: {
        type: Number,
        default: 0,
      },

      couponCode: {
        type: String,
        default: null,
      },

      couponDiscount: {
        type: Number,
        default: 0,
      },

      maxAllowedDiscount: {
        type: Number,
        default: 0,
      },
    },
    payableAmount: Number,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    tempBookingStatus: {
      type: String,
      enum: [
        "initiated",
        "success",
        "failed",
        "payment_pending",
        "payment_success",
        "payment_failed",
      ],
      default: "initiated",
    },

    supplierResponse: {
      bookingRefNo: String,
      statusId: String,

      hotelTicketResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      hotelRequeryResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      hotelVoucherNumber: String,

      voucherNumber: String,

      invoiceNumber: String,

      ticketStatusId: String,

      ticketStatusDesc: String,

      checkInDate: String,

      checkOutDate: String,

      confirmedAt: Date,
    },

    responseTime: Number,

    errorMessage: String,
    payment: {
      gateway: {
        type: String,
        default: "razorpay",
      },

      orderId: {
        type: String,
        default: null,
      },

      paymentId: {
        type: String,
        default: null,
      },

      signature: {
        type: String,
        default: null,
      },

      amount: {
        type: Number,
        default: 0,
      },

      currency: {
        type: String,
        default: "INR",
      },

      status: {
        type: String,
        enum: ["created", "success", "failed"],
        default: "created",
      },

      paidAt: {
        type: Date,
        default: null,
      },

      gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  },

  { timestamps: true },
);
hotelCartSchema.index({
  userId: 1,
  paymentStatus: 1,
  tempBookingStatus: 1,
  "supplierResponse.bookingRefNo": 1,
});
export default mongoose.model("Hotelcart", hotelCartSchema);
