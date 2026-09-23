import jwt from "jsonwebtoken";
import { sendEmail } from "../../utils/sendEmail.js";
import { verifyEmailTemplate } from "./email.templates.js";

export const sendVerificationEmail = async (user) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

const verifyLink = `${process.env.CLIENT_URL}/api/v1/auth/verify-email?token=${token}`;

  const html = verifyEmailTemplate(user.name, verifyLink);

  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html,
  });
};
