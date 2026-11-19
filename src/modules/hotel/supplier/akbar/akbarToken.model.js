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
    clientId: {
      type: String,
      default: null,
    },
    signatureTui: {
      type: String,
      default: null,
    },
    agentProfile: {
      type: new mongoose.Schema({
        agentCode: { type: String, required: true },
        segmentId: { type: String, required: true },
        companyId: { type: String, required: true },
      }, { _id: false }),
      default: null,
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
