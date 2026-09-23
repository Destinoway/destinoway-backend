import mongoose from "mongoose";

const countrySchema = new mongoose.Schema(
  {
    id: Number, // custom incremental id
    countryName: String,
    countryCode: String,
      phoneCode: String
  },
  { timestamps: true }
);

export default mongoose.model("Country", countrySchema);