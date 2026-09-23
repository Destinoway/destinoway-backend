import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: [
        "razorpay",
        "stripe"
      ],
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    priority: {
      type: Number,
      default: 1
    },

    supportedCurrencies: [
      String
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "PaymentGateway",
  schema
);