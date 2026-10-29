import fs from "fs";
import path from "path";

export const getEmailTemplate = (otp, expiryMinutes = 5) => {
  const filePath = path.resolve("src/templates/customerTemplate/emailOtpTemplate.html");

  let html = fs.readFileSync(filePath, "utf8");

  const otpBoxes = String(otp)
    .split("")
    .map(
      (digit) => `<td style="padding:0 12px 0 0;vertical-align:middle">
        <table role="presentation" width="44" height="52" cellspacing="0" cellpadding="0" border="0" style="width:44px;height:52px;border:1px solid #7180a5;border-radius:6px;background:#fff">
          <tr><td align="center" valign="middle" style="color:#102354;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:1">${digit}</td></tr>
        </table>
      </td>`,
    )
    .join("");
  const otpBoxesTable = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr>${otpBoxes}</tr></table></td></tr></table>`;

  html = html
    .replace("{{OTP_BOXES}}", otpBoxesTable)
    .replace("{{EXPIRY_MINUTES}}", String(expiryMinutes))
    .replace("{{YEAR}}", String(new Date().getFullYear()));

  return html;
};
