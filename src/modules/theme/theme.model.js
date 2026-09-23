// theme.model.js

import mongoose from "mongoose";

const themeSchema = new mongoose.Schema(
  {
    primaryColor: {
      type: String,
      default: "#FDA20F",
    },

    secondaryColor: {
      type: String,
      default: "#05144B",
    },

    hoverColor: {
      type: String,
      default: "#0C2FB1",
    },

    textPrimary: {
      type: String,
      default: "#05144B",
    },

    textSecondary: {
      type: String,
      default: "#FDA20F",
    },

    borderColor: {
      type: String,
      default: "#051449",
    },

    gradientStart: {
      type: String,
      default: "#05144B",
    },

    gradientEnd: {
      type: String,
      default: "#0C2FB1",
    },

    searchBarBackgroundColor: {
      type: String,
      default: "#0C2FB1",
    },

    searchBarButtonBackgroundColor: {
      type: String,
      default: "#05144B",
    },

    footerBackgroundColor: {
      type: String,
      default: "#05144B",
    },

    footerTextColor: {
      type: String,
      default: "#FFFFFF",
    },

    websiteBackgroundColor: {
      type: String,
      default: "#FFFFFF",
    },

    whiteColor: {
      type: String,
      default: "#FFFFFF",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Theme", themeSchema);
