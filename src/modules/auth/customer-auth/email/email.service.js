import { readFile } from "node:fs/promises";
import transporter from "../../../../config/mailer.js";
import { getEmailTemplate } from "../../../../utils/emailTemplateReader.js";
import { findOrCreateAndMergeUser } from "../auth.service.js";
import { sendOtp, verifyOtp } from "../shared/otp/otp.core.js";

export const sendEmailOtpService = async (email) => {
  if (!email) throw new Error("Email required");

  const normalizedEmail = email.toLowerCase().trim();

  const otp = await sendOtp("email", normalizedEmail);

  const htmlTemplate = getEmailTemplate(otp);
  const companyLogo = await readFile(
    new URL("../../../mail/assets/destinoway-logo.png", import.meta.url),
  );

  await transporter.sendMail({
    to: normalizedEmail,
    subject: "Verify your email | Destinoway",
    html: htmlTemplate,
    attachments: [
      {
        filename: "destinoway-logo.png",
        content: companyLogo,
        contentType: "image/png",
        cid: "destinoway-logo",
      },
    ],
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
