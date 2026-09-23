import mongoose from "mongoose";

const masterDataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["YOUR_VIBE", "POPULAR_DESTINATIONS","Blogs"],
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

masterDataSchema.index({ type: 1, placeName: 1 }, { unique: true });

export default mongoose.model("MasterData", masterDataSchema);