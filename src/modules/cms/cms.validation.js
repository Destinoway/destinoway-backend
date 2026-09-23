import Joi from "joi";

import { CMS_ENTITY_TYPES, CMS_TEMPLATES } from "./cms.templates.js";

const templateFields = {
  content: Joi.object({
    heading: Joi.string(),
    content: Joi.string(),
  }),

  heroContent: Joi.object({
    heroTitle: Joi.string(),
    heroImage: Joi.string(),
    content: Joi.string(),
    ctaTitle: Joi.string(),
    ctaLink: Joi.string(),
  }),

  marketing: Joi.object({
    bannerTitle: Joi.string(),
    bannerImage: Joi.string(),
    content: Joi.string(),
  }),

  article: Joi.object({
    coverImage: Joi.string(),
    author: Joi.string(),
    content: Joi.string(),
  }),
};

export const createCMSValidation = Joi.object({
  title: Joi.string().required(),
  slug: Joi.string().optional(),
  entityType: Joi.string()
    .valid(...CMS_ENTITY_TYPES)
    .required(),
  entityId: Joi.string().allow("", null),

  metaTitle: Joi.string().allow(""),
  metaDescription: Joi.string().allow(""),
  description: Joi.string().allow(""),
  featuredImage: Joi.string().allow(""),
  keywords: Joi.array().items(Joi.string()),
  schema: Joi.any(),
  data: Joi.object(),
  categoryId: Joi.string().allow(""),
  isPublished: Joi.boolean(),
});

export const updateCMSValidation = createCMSValidation.fork(
  ["title", "slug"],
  (field) => field.optional(),
);
