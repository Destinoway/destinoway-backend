import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: [
        "razorpay",
        "stripe"
      ],
      required: true,
      trim: true,
      lowercase: true,
      unique: true
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
