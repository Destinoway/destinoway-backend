// modules/markup/markup.model.js
import mongoose from "mongoose";

const markupSchema = new mongoose.Schema(
  {
    level: {
      type: String,
     enum: [
 "worldwide",
 "country",
 "state",
 "city",
 "hotel",
 "additional_tax"
],
      required: true,
    },

    markupType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    markupValue: {
      type: Number,
      required: true,
    },
    serviceChargeValue: {
  type: Number,
      required: true,
},

    serviceChargeValue: {
      type: Number,
      required: true,
    },

    countryCode: String,
    stateName: String,
    cityId: String,
    hotelId: String,
    cityName:String,
    hotelName:String,
   startDate: Date,
    endDate: Date,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

/////////////////////////////////////////////////////////
// 🔥 ADD INDEXES HERE (VERY IMPORTANT)
/////////////////////////////////////////////////////////

/* 🌍 Worldwide unique */
markupSchema.index(
  { level: 1 },
  {
    unique: true,
    partialFilterExpression: { level: "worldwide", isActive: true },
  },
);

/* 🌎 Country unique */
markupSchema.index(
  { level: 1, countryCode: 1 },
  {
    unique: true,
    partialFilterExpression: { level: "country", isActive: true },
  },
);

/* 🏞 State unique */
markupSchema.index(
  { level: 1, countryCode: 1, stateName: 1 },
  { unique: true, partialFilterExpression: { level: "state", isActive: true } },
);

/* 🏙 City unique */
markupSchema.index(
  { level: 1, cityId: 1 },
  { unique: true, partialFilterExpression: { level: "city", isActive: true } },
);

/* 🏨 Hotel unique */
markupSchema.index(
  { level: 1, hotelId: 1 },
  { unique: true, partialFilterExpression: { level: "hotel", isActive: true } },
);

/////////////////////////////////////////////////////////

export default mongoose.model("Markup", markupSchema);
