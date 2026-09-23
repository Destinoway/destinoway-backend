import mongoose from "mongoose";

const currencyRateSchema = new mongoose.Schema(
  {
    baseCurrency: {
      type: String,
      required: true,
      unique: true,
    },

    rates: {
      type: Object,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      expires: 3600,
    },
  },
  {
    timestamps: true, // important
  },
);

export default mongoose.model("CurrencyRate", currencyRateSchema);
