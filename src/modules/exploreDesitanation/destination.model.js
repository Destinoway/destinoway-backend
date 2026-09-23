import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["YOUR_VIBE", "POPULAR_DESTINATIONS","BLOGS"],
      required: true,
    },

    placeName: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

destinationSchema.index({ type: 1, placeName: 1 }, { unique: true });

export default mongoose.model("Destination", destinationSchema);