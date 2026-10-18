import mongoose from "mongoose";

const akbarTokenSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "hotel",
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("AkbarToken", akbarTokenSchema);
