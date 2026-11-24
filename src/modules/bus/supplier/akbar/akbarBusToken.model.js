import mongoose from "mongoose";

// Same "akbartokens" collection that hotel uses (hotel doc: _id "hotel").
// Bus stores its own doc with _id "bus". Separate model name so it
// does not clash with the hotel model.
const akbarBusTokenSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "bus",
    },
    token: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      default: null,
    },
    signatureTui: { type: String, default: null },
    expiresAt: {
      type: Date,
      required: true,
      // Mongo deletes the doc automatically after expiresAt.
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "akbartokens",
  },
);

export default mongoose.models.AkbarBusToken ||
  mongoose.model("AkbarBusToken", akbarBusTokenSchema);
