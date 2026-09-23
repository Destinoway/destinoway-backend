import Joi from "joi";

export const createOrderSchema =
Joi.object({

  orderId: Joi.string()
    .required(),

  userId: Joi.string()
    .required(),

  amount: Joi.number()
    .required(),

  currency: Joi.string()
    .required()
});