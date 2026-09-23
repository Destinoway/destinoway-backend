import fs from "fs";
import path from "path";

export const getEmailTemplate = (otp) => {
  const filePath = path.resolve("src/templates/customerTemplate/emailOtpTemplate.html");

  let html = fs.readFileSync(filePath, "utf8");

  // replace variable
  html = html.replace("{{OTP}}", otp);

  return html;
};