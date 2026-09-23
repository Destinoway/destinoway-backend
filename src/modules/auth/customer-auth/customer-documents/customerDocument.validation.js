import Joi from "joi";

export const updateCustomerDocumentValidation = Joi.object({
  passportNumber: Joi.string().trim().min(3).max(20).allow("", null),

  passportExpiryDate: Joi.date().iso().allow(null),

  passportIssuingCountry: Joi.string().trim().min(2).max(100).allow("", null),

  panCardNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Invalid PAN card number",
    }),
});
