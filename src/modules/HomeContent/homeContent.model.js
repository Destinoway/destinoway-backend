import mongoose from "mongoose";

import { HOME_CONTENT_SECTION } from "./homeContent.constants.js";

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    cityId: {
      type: String,
      default: "",
    },

    hotelId: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    alt: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  },
);

const homeContentSchema = new mongoose.Schema(
  {
    sectionType: {
      type: String,
      enum: Object.values(HOME_CONTENT_SECTION),
      required: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },
    

    category: {
      type: String,
      trim: true,
      default: "",
    },

    items: [
      {
        name: String,
        city: String,
        cityId: String,
        hotelId: String,

        image: String,
        alt: String,

        description: String,
        rating: Number
      }
    ],

  

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

homeContentSchema.index({
  sectionType: 1,
});

export default mongoose.model("HomeContent", homeContentSchema);
