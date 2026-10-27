import { sendMail as sendMicrosoft365Mail } from "../../../config/mailer.js";

export const sendMail = async ({
  to,
  subject,
  html,
  attachments = [],
}) => {

  return sendMicrosoft365Mail({
    to,
    subject,
    html,
    attachments,
  });

};
