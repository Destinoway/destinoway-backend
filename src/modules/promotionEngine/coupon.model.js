import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    applicableModules: [
      {
        type: String,
        enum: ["hotel", "flight", "bus", "train", "wallet", "holiday"],
      },
    ],
    discountType: {
      type: String,
      enum: ["flat", "percent"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    minAmount: { type: Number, default: 0, min: 0 },
    maxDiscountPercentOfServiceTax: { type: Number, default: 70, min: 0 },
    isAutoApply: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    validity: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

couponSchema.index({
  isActive: 1,
  isAutoApply: 1,
  applicableModules: 1,
  minAmount: 1,
  "validity.startDate": 1,
  "validity.endDate": 1,
});

export default mongoose.model("Coupon", couponSchema);
