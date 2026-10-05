import path from "path";

// export const buildHotelInvoice = (doc, data) => {
//   const hotel = data?.HotelDetails || {};
//   const ratePlan = hotel?.HotelRatePlanDetails || {};
//   const guest = data?.PAXDetails?.[0] || {};
//   const payment = data?.BookingPaymentDetails?.[0] || {};
//   const logoPath = path.join(
//     process.cwd(),
//     "src/modules/hotel/invoice/assets/logo.png",
//   );

//   doc.rect(0, 0, doc.page.width, 110).fill("#72C0F0");
//   try {
//     doc.image(logoPath, 40, 25, {
//       width: 120,
//     });
//   } catch {}
//   doc
//     .fillColor("white")
//     .fontSize(24)
//     .font("Helvetica-Bold")
//     .text("HOTEL INVOICE", 340, 40);

//   doc.fillColor("black").fontSize(12);
//   let y = 140;
//   doc.text(`Invoice No: ${data?.InvoiceNumber || "-"}`, 40, y);
//   doc.text(`Booking Ref: ${data?.BookingRefNo || "-"}`, 40, y + 20);
//   doc.text(`Voucher No: ${data?.VoucherNumber || "-"}`, 40, y + 40);
//   doc.text(`Status: ${data?.TicketStatusDesc || "-"}`, 320, y);
//   y += 90;
//   doc
//     .font("Helvetica-Bold")
//     .fontSize(16)
//     .fillColor("#72C0F0")
//     .text("Guest Details", 40, y);
//   doc.fillColor("black").fontSize(11);
//   y += 30;
//   doc.text(
//     `${guest?.Title || ""} ${guest?.FirstName || ""} ${guest?.LastName || ""}`,
//     40,
//     y,
//   );
//   doc.text(guest?.Passengertyp || "Adult", 40, y + 20);

//   y += 70;
//   doc
//     .font("Helvetica-Bold")
//     .fontSize(16)
//     .fillColor("#72C0F0")
//     .text("Hotel Details", 40, y);

//   y += 30;
//   doc.fillColor("black").fontSize(11);
//   doc.text(hotel?.HotelName || "-", 40, y);
//   doc.text(hotel?.Address || "-", 40, y + 20, {
//     width: 500,
//   });
//   doc.text(`Check In: ${data?.CheckInDate}`, 40, y + 60);
//   doc.text(`Check Out: ${data?.CheckOutDate}`, 250, y + 60);

//   y += 120;
//   doc
//     .font("Helvetica-Bold")
//     .fontSize(16)
//     .fillColor("#72C0F0")
//     .text("Payment Summary", 40, y);
//   y += 35;
//   doc.fillColor("black").fontSize(11);
//   doc.text("Room Charges", 40, y);
//   doc.text(`₹${Number(ratePlan?.Basic_Amount || 0).toFixed(2)}`, 430, y);
//   y += 25;
//   doc.text("Taxes & Fees", 40, y);
//   doc.text(`₹${Number(ratePlan?.Tax || 0).toFixed(2)}`, 430, y);
//   y += 25;
//   doc.text("Gateway Charges", 40, y);
//   doc.text(`₹${Number(payment?.Gateway_Charges || 0).toFixed(2)}`, 430, y);
//   y += 40;
//   doc.font("Helvetica-Bold").fontSize(15).text("TOTAL PAID", 40, y);
//   doc.text(
//     `₹${Number(payment?.Payment_Amount || ratePlan?.Total_Amount || 0).toFixed(
//       2,
//     )}`,
//     430,
//     y,
//   );

//   doc
//     .fontSize(10)
//     .fillColor("gray")
//     .text("Thank you for booking with PAN JOURNEY", 40, 760, {
//       align: "center",
//     });

//   doc.text("This is a computer generated invoice.", {
//     align: "center",
//   });
// };
export const buildHotelInvoice = (doc, booking) => {
  const requery = booking?.supplierResponse?.hotelRequeryResponse || {};

  const hotel = requery?.HotelDetails || {};
  const ratePlan = hotel?.HotelRatePlanDetails || {};

  const guest = requery?.PAXDetails?.[0] || {};

  const payment = booking?.payment || {};

  const pricing = booking?.pricing || {};

  const logoPath = path.join(
    process.cwd(),
    "src/modules/hotel/invoice/assets/logo.png"
  );

  doc.rect(0, 0, doc.page.width, 110).fill("#72C0F0");

  try {
    doc.image(logoPath, 40, 25, { width: 120 });
  } catch {}

  doc
    .fillColor("white")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("HOTEL INVOICE", 340, 40);

  doc.fillColor("black").fontSize(12);

  let y = 140;

  doc.text(`Invoice No: ${booking?.supplierResponse?.invoiceNumber || "-"}`, 40, y);

  doc.text(`Booking Ref: ${booking?.supplierResponse?.bookingRefNo || "-"}`, 40, y + 20);

  doc.text(`Voucher No: ${booking?.supplierResponse?.voucherNumber || "-"}`, 40, y + 40);

  doc.text(
    `Status: ${booking?.supplierResponse?.ticketStatusDesc || "-"}`,
    320,
    y
  );

  y += 90;

  // ================= Guest =================

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#72C0F0")
    .text("Guest Details", 40, y);

  y += 30;

  doc.fillColor("black").fontSize(11);

  doc.text(
    `${guest?.Title || ""} ${guest?.FirstName || ""} ${guest?.LastName || ""}`,
    40,
    y
  );

  doc.text(guest?.Passengertyp || "Adult", 40, y + 20);

  y += 70;

  // ================= Hotel =================

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#72C0F0")
    .text("Hotel Details", 40, y);

  y += 30;

  doc.fillColor("black").fontSize(11);

  doc.text(hotel?.HotelName || "-", 40, y);

  doc.text(hotel?.Address || "-", 40, y + 20, {
    width: 500,
  });

  doc.text(
    `Check In: ${booking?.supplierResponse?.checkInDate || "-"}`,
    40,
    y + 60
  );

  doc.text(
    `Check Out: ${booking?.supplierResponse?.checkOutDate || "-"}`,
    250,
    y + 60
  );

  y += 120;

  // ================= Payment =================

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#72C0F0")
    .text("Payment Summary", 40, y);

  y += 35;

  doc.fillColor("black").fontSize(11);

  doc.text("Room Charges", 40, y);

  doc.text(
    `₹${(
      pricing.finalPrice -
      pricing.platformFeeAndTax
    ).toFixed(2)}`,
    430,
    y
  );

  y += 25;

  doc.text("Platform Fee & Tax", 40, y);

  doc.text(
    `₹${Number(pricing.platformFeeAndTax || 0).toFixed(2)}`,
    430,
    y
  );

  y += 25;

  doc.text("Gateway Charges", 40, y);

  doc.text(
    `₹${Number(
      (payment?.gatewayResponse?.fee || 0) / 100
    ).toFixed(2)}`,
    430,
    y
  );

  y += 40;

  doc.font("Helvetica-Bold").fontSize(15);

  doc.text("TOTAL PAID", 40, y);

  doc.text(
    `₹${Number(payment?.amount || booking?.payableAmount || 0).toFixed(2)}`,
    430,
    y
  );

  doc
    .fontSize(10)
    .fillColor("gray")
    .text("Thank you for booking with PAN JOURNEY", 40, 760, {
      align: "center",
    });

  doc.text("This is a computer generated invoice.", {
    align: "center",
  });
};