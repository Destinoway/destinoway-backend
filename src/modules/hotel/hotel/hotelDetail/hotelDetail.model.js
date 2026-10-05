import mongoose from "mongoose";


// ============================================================
// ROOM SCHEMA
// ============================================================

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    roomType: {
      type: String,
      default: null,
    },

    ratePlanId: {
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

    cancellationPolicy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    payment: {
      creditCardRequired: {
        type: Boolean,
        default: false,
      },

      panMandatory: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    _id: false,
  }
);


// ============================================================
// HOTEL DETAIL SCHEMA
// ============================================================

const hotelDetailSchema = new mongoose.Schema(
  {
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

    hotelKey: {
      type: String,
      default: null,
    },
importantInformation: {
  type: [String],
  default: [],
},
    searchKey: {
      type: String,
      default: null,
    },
      name: {
      type: String,
      default: null,
    },

    location: {
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

    starCategory: {
      type: Number,
      default: null,
    },

    checkIn: {
      date: {
        type: String,
        default: null,
      },

      time: {
        type: String,
        default: null,
      },
    },

    checkOut: {
      date: {
        type: String,
        default: null,
      },

      time: {
        type: String,
        default: null,
      },
    },

    policy: {
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

    gallery: {
      type: [
        {
          description: {
            type: String,
            default: null,
          },

          url: {
            type: String,
            default: null,
          },
        },
      ],

      default: [],
    },


    rooms: {
      type: [roomSchema],
      default: [],
    },

    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 60 * 60 * 1000),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


// ============================================================
// TTL INDEX
// MongoDB document automatically deletes after expiresAt
// ============================================================
hotelDetailSchema.index(
  { hotelDetailId: 1, hotelId: 1 },
  { unique: true }
);

// TTL
hotelDetailSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "HotelDetail",
  hotelDetailSchema
);
