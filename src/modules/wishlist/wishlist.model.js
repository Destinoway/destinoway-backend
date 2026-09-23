import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hotelId: {
      type: String,
      required: true,
      trim: true,
    },

    hotelName: {
      type: String,
      required: true,
      trim: true,
    },

    hotelSlug: {
      type: String,
      default: "",
      trim: true,
    },

    hotelImage: {
      type: String,
      default: "",
    },

    cityId: {
      type: String,
      required: true,
      trim: true,
    },
    checkInDate: {
      type: String,
      default: "",
    },

    checkOutDate: {
      type: String,
      default: "",
    },

    roomCount: {
      type: Number,
      default: 1,
    },
    cityName: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedCity: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stateName: {
      type: String,
      default: "",
      trim: true,
    },

    countryCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    countryName: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    starRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    facilities: {
      type: [String],
      default: [],
    },

    freeCancellation: {
      type: Boolean,
      default: false,
    },

    savedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    savedTax: {
      type: Number,
      default: 0,
      min: 0,
    },

    supplier: {
      type: String,
      default: "TBO",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

wishlistSchema.index(
  {
    userId: 1,
    hotelId: 1,
  },
  {
    unique: true,
  },
);

wishlistSchema.index({
  userId: 1,
  normalizedCity: 1,
  countryCode: 1,
});

export default mongoose.model("Wishlist", wishlistSchema);
