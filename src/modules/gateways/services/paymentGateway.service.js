import PaymentGateway from "../models/paymentGateway.model.js";
import { createPaymentGatewayValidation } from "../validators/paymentGateway.validator.js";

const duplicateError = () => Object.assign(new Error("Payment gateway configuration already exists"), { statusCode: 409 });

export const createPaymentGatewayConfig = async (payload) => {
  const { value, error } = createPaymentGatewayValidation.validate(payload ?? {}, { abortEarly: false });
  if (error) {
    throw Object.assign(new Error(error.details.map(item => item.message).join("; ")), { statusCode: 400 });
  }
  if (await PaymentGateway.findOne({ name: value.name })) throw duplicateError();
  try {
    return await PaymentGateway.create(value);
  } catch (error) {
    // The unique name index also protects concurrent create requests.
    if (error.code === 11000) throw duplicateError();
    throw error;
  }
};
