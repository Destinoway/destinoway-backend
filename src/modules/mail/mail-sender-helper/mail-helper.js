import transporter from "../../../config/mailer.js";

export const sendMail = async ({
  to,
  subject,
  html,
  attachments = [],
}) => {

  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
    attachments,
  });

};