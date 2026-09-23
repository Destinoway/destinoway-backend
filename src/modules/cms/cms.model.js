import mongoose from "mongoose";

import { CMS_ENTITY_TYPES } from "./cms.templates.js";

const cmsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},
    entityType: {
      type: String,
      required: true,
      enum: CMS_ENTITY_TYPES,
    },

    entityId: {
      type: String,
      default: null,
    },

    // template: {
    //   type: String,
    //   required: true,
    //   enum: Object.keys(CMS_TEMPLATES),
    // },

    metaTitle: {
      type: String,
      default: "",
    },

    metaDescription: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    featuredImage: {
      type: String,
      default: "",
    },

    keywords: [
      {
        type: String,
      },
    ],

    schema: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    categoryId: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

cmsSchema.index({
  slug: 1,
});

cmsSchema.index(
  {
    entityType: 1,
    entityId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      entityId: {
        $exists: true,
        $ne: null,
      },
    },
  },
);

export default mongoose.model("CMSPage", cmsSchema);
