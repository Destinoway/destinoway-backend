import Joi from "joi";

export const createPaymentGatewayValidation = Joi.object({
  name: Joi.string().trim().lowercase().valid("razorpay", "stripe").required(),
  isActive: Joi.boolean().strict().default(true),
  priority: Joi.number().integer().min(1).max(1000).default(1),
  supportedCurrencies: Joi.array()
    .items(Joi.string().trim().uppercase().pattern(/^[A-Z]{3}$/).required())
    .min(1).max(200).unique().required(),
}).unknown(false);
