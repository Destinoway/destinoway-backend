import mongoose from "mongoose";

// Internal, site-relative paths only ("/x"), never protocol-relative or absolute URLs.
const SAFE_PATH = /^\/(?!\/)[^\s\\]*$/;

const pathField = {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: (value) => SAFE_PATH.test(value),
    message: "Redirect paths must be internal paths starting with a single '/'",
  },
};

const cmsRedirectSchema = new mongoose.Schema(
  {
    fromPath: { ...pathField, lowercase: true, unique: true },
    toPath: pathField,
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CMSPage",
      required: true,
      index: true,
    },
    entityType: { type: String, default: "" },
    statusCode: { type: Number, enum: [301], default: 301 },
  },
  { timestamps: true },
);

export const isSafeRedirectPath = (value) =>
  typeof value === "string" && SAFE_PATH.test(value);

export default mongoose.model("CMSRedirect", cmsRedirectSchema);
