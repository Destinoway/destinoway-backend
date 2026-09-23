

import { normalizeMobile } from "../../../../utils/normalizeMobile.js";
import { sendOtp, verifyOtp } from "../shared/otp/otp.core.js";

export const sendOTPService = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);

  await sendOtp("mobile", normalizedMobile); // ✅ updated

  return true;
};

export const verifyOTPService = async (mobile, otp) => {
  const normalizedMobile = normalizeMobile(mobile);

  await verifyOtp("mobile", normalizedMobile, otp); // ✅ updated

  return true;
};