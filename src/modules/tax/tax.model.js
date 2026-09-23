import mongoose from "mongoose";

const slabSchema = new mongoose.Schema(
  {
    minAmount: {
      type: Number,
      required: true,
    },

    taxValue: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const taxRuleSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["hotel", "flight", "bus", "visa", "insurance"],
      default: "hotel",
    },

    ruleType: {
      type: String,
      enum: ["flat", "slab"],
      required: true,
    },

    taxType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    taxValue: Number,

    slabs: [slabSchema],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

taxRuleSchema.index(
  { countryCode: 1, serviceType: 1 },
  { unique: true }
);

export default mongoose.model("TaxRule", taxRuleSchema);