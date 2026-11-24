import mongoose from "mongoose";

// One persistent cache entry per country/state, including valid empty lists.
const cityCacheSchema = new mongoose.Schema({
  countryCode: { type: String, required: true },
  countryName: { type: String, required: true },
  stateName: { type: String, required: true },
  stateKey: { type: String, required: true },
  cities: { type: [String], required: true },
}, { timestamps: true });

cityCacheSchema.index({ countryCode: 1, stateKey: 1 }, { unique: true });

export default mongoose.model("CityCache", cityCacheSchema);
