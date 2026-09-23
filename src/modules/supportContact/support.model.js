import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    customerSupport: {
      type: [String],
      required: true,
      default: [],
    },

    whatsappSupport: {
      type: [String],
      required: true,
      default: [],
    },

    bookingSupport: {
      type: [String],
      required: true,
      default: [],
    },

    bussinessPartnership: {
      type: [String],
      required: true,
      default: [],
    },

    workingDays: {
      type: String,
      default: "Monday - Sunday",
    },

    workinghr: {
      type: String,
      default: "10:00 AM - 6:00 PM",
    },

    immidiateHelpNumber: {
      type: [String],
      required: true,
      trim: true,
    },

    immidiateHelpEmail: {
      type: [String],
      required: true,
      trim: true,
    },

    supportType: {
      type: String,
      enum: ["contact_us", "grievance_redressal"],
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["hotel", "flight", "bus"],
      default: "hotel",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Support", supportSchema);

