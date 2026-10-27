

import { normalizeMobile } from "../../../../utils/normalizeMobile.js";
import {
  checkTwilioVerification,
  startTwilioVerification,
} from "./twilioVerify.service.js";

export const sendOTPService = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);

  return startTwilioVerification(normalizedMobile);
};

export const verifyOTPService = async (mobile, otp) => {
  const normalizedMobile = normalizeMobile(mobile);

  return checkTwilioVerification(normalizedMobile, String(otp));
};
