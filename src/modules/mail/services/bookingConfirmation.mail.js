import { readFile } from "node:fs/promises";
import { sendMail } from "../mail-sender-helper/mail-helper.js";
import { bookingConfirmationTemplate } from "../templates/bookingConfirmation.template.js";

export const sendBookingConfirmationEmail = async ({
  email,
  customerName,
  bookingRefNo,
  pnr,
  hotelName,
  hotelAddress,
  city,
  checkIn,
  checkOut,
  rooms,
  guests,
  amount,
  currency,
  voucherNumber,
  pdfBuffer,
}) => {
  const companyLogo = await readFile(
    new URL("../assets/destinoway-logo.png", import.meta.url),
  );

  const html = bookingConfirmationTemplate({
    customerName,
    bookingRefNo,
    pnr,
    hotelName,
    hotelAddress,
    city,
    checkIn,
    checkOut,
    rooms,
    guests,
    amount,
    currency,
    voucherNumber,
  });

  await sendMail({
    to: email,
    subject: `Booking Confirmed | ${bookingRefNo}`,
    html,
    attachments: [
      {
        filename: "destinoway-logo.png",
        content: companyLogo,
        contentType: "image/png",
        cid: "destinoway-logo",
      },
      ...(pdfBuffer
        ? [
            {
              filename: `Invoice-${bookingRefNo}.pdf`,
              content: pdfBuffer,
            },
          ]
        : []),
    ],
  });
};
