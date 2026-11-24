import { normalizeMobileCountryCode } from "../../utils/mobileNumber.js";

export const supportPhoneFields = ["customerSupport", "whatsappSupport", "bookingSupport", "bussinessPartnership", "immidiateHelpNumber"];

export const normalizeSupportPhones = (payload, existing = {}) => {
  const result = { ...payload };
  for (const field of supportPhoneFields) {
    const codeField = `${field}CountryCodes`;
    if (payload[field] === undefined && payload[codeField] === undefined) continue;
    const value = payload[field] ?? existing[field] ?? [];
    const numbers = Array.isArray(value) ? value : [value];
    const provided = payload[codeField];
    const previous = existing[codeField];
    const codes = provided ?? (previous?.length === numbers.length ? previous : numbers.map(() => "+91"));
    if (!Array.isArray(codes) || codes.length !== numbers.length) {
      throw Object.assign(new Error(`${codeField} must contain one calling code per ${field} number`), { statusCode: 400 });
    }
    result[field] = numbers;
    result[codeField] = codes.map(normalizeMobileCountryCode);
  }
  return result;
};
