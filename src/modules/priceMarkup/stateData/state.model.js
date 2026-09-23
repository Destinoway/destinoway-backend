import mongoose from "mongoose";

const stateSchema = new mongoose.Schema(
  {
    id: Number,
    stateName: String,
    countryCode: String, // IN, US etc (link to country)
  },
  { timestamps: true }
);

export default mongoose.model("State", stateSchema);