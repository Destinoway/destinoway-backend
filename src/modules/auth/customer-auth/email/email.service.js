import transporter from "../../../../config/mailer.js";
import { getEmailTemplate } from "../../../../utils/emailTemplateReader.js";
import { findOrCreateAndMergeUser } from "../auth.service.js";
import { sendOtp, verifyOtp } from "../shared/otp/otp.core.js";

export const sendEmailOtpService = async (email) => {
  if (!email) throw new Error("Email required");

  const normalizedEmail = email.toLowerCase().trim();

  const otp = await sendOtp("email", normalizedEmail);

  const htmlTemplate = getEmailTemplate(otp);

  await transporter.sendMail({
    from: `"Travel App" <${process.env.GMAIL_USER}>`,
    to: normalizedEmail,
    subject: "Your OTP Code",
    html: htmlTemplate
  });

  return true;
};

export const verifyEmailOtpService = async (email, otp) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 🔥 VERIFY (shared)
  await verifyOtp("email", normalizedEmail, otp);

  const user = await findOrCreateAndMergeUser({
    email: normalizedEmail,
    provider: "email",
  });

  return user;
};
