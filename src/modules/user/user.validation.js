import Joi from "joi";

// MongoDB ObjectId validator
const objectId = Joi.string().hex().length(24);

// CREATE STAFF VALIDATION

export const createStaffValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),

  email: Joi.string().email().required(),

  mobile: Joi.string()
    .pattern(/^[0-9]{4,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Mobile must contain 4 to 14 digits",
    }),

  password: Joi.string().min(6).required(),
  mobileCountryCode: Joi.string().pattern(/^\+?[1-9]\d{0,2}$/),

  // 🔥 role id required
  role: objectId.required(),
});

// UPDATE USER VALIDATION

export const updateUserValidation = Joi.object({
  name: Joi.string().min(2).max(50),

  email: Joi.string().email(),

  mobile: Joi.string().pattern(/^[0-9]{4,14}$/),
  mobileCountryCode: Joi.string().pattern(/^\+?[1-9]\d{0,2}$/),

  password: Joi.string().min(6),

  // allow role change
  role: objectId,
});
