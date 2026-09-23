import express from "express";

import { sendOTP, verifyOTP } from "./otp/otp.controller.js";
import { sendEmailOtp, verifyEmailOtp } from "./email/email.controller.js";
import { googleLogin } from "./google/google.controller.js";

import { refreshAccessToken } from "./refresh.controller.js";
import { logoutCustomer } from "./logout.controller.js";

const router = express.Router();

// 🔹 OTP
router.post("/otp/send", sendOTP);
router.post("/otp/verify", verifyOTP);

// 🔹 EMAIL
router.post("/email/send", sendEmailOtp);
router.post("/email/verify", verifyEmailOtp);

// 🔹 GOOGLE
router.post("/google", googleLogin);

// 🔹 TOKEN
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutCustomer);


export default router;