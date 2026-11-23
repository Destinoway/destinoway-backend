

import { parseMobileNumber } from "../../../../utils/mobileNumber.js";
import {
  checkTwilioVerification,
  startTwilioVerification,
} from "./twilioVerify.service.js";

export const sendOTPService = async (mobile, countryCode) => {
  const phone = parseMobileNumber(mobile, countryCode);

  return startTwilioVerification(phone.mobile, phone.mobileCountryCode);
};

export const verifyOTPService = async (mobile, otp, countryCode) => {
  const phone = parseMobileNumber(mobile, countryCode);

  return checkTwilioVerification(phone.mobile, String(otp), phone.mobileCountryCode);
};
