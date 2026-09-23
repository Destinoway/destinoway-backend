import { sendMail } from "../mail-sender-helper/mail-helper.js";
import { bookingConfirmationTemplate } from "../templates/bookingConfirmation.template.js";

export const sendBookingConfirmationEmail = async ({
  email,
  customerName,
  bookingRefNo,
  hotelName,
  hotelAddress,
  city,
  checkIn,
  checkOut,
  rooms,
  guests,
  amount,
  currency,
  pdfBuffer,
}) => {

  const html = bookingConfirmationTemplate({
    customerName,
    bookingRefNo,
    hotelName,
    hotelAddress,
    city,
    checkIn,
    checkOut,
    rooms,
    guests,
    amount,
    currency,
  });

  await sendMail({
    to: email,
    subject: `Booking Confirmed | ${bookingRefNo}`,
    html,
    attachments: pdfBuffer
      ? [
          {
            filename: `Invoice-${bookingRefNo}.pdf`,
            content: pdfBuffer,
          },
        ]
      : [],
  });
};