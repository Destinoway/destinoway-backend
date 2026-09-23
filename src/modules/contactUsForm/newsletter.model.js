import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    isSubscribed: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;