const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const bookingConfirmationTemplate = ({
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
  currency = "INR",
  voucherNumber,
}) => {
  const safeName = escapeHtml(customerName || "Guest");
  const safeBookingRef = escapeHtml(bookingRefNo);
  const safeHotelName = escapeHtml(hotelName || "Hotel");
  const safeAddress = [hotelAddress, city].filter(Boolean).map(escapeHtml).join(", ") || "—";
  const safePnr = escapeHtml(pnr || bookingRefNo || "—");
  const safeVoucher = escapeHtml(voucherNumber);
  const safeGuests = escapeHtml(guests || "—");
  const safeAmount = escapeHtml(amount ?? "—");
  const safeCurrency = escapeHtml(currency);
  const roomCount = Number.isFinite(Number(rooms)) ? Number(rooms) : 0;
  const nights = (() => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.max(0, Math.round((end - start) / 86400000));
  })();
  const staySummary = [
    nights === null ? null : `${nights} ${nights === 1 ? "night" : "nights"}`,
    `${roomCount} ${roomCount === 1 ? "room" : "rooms"}`,
  ].filter(Boolean).join(" · ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Destinoway Booking Confirmation</title>
  </head>
  <body style="margin:0;padding:16px 8px;background:#eef0f4;color:#17254f;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e8ef">
      <tr><td style="padding:10px 20px;background:#fff4df;border-bottom:1px solid #e7d9bc">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td width="210" valign="middle"><img src="cid:destinoway-logo" width="190" height="64" alt="Destinoway" style="display:block;width:190px;height:64px;object-fit:contain;border:0" /></td>
          <td align="right" valign="middle" style="color:#17254f;font-size:12px">Powering unforgettable stays across India</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px">
        <p style="font-size:16px;font-weight:bold;margin:0 0 8px">Hi ${safeName},</p>
        <p style="margin:0 0 16px;color:#5e6880">Your hotel booking is confirmed. Here are your reservation details.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;background:#17244c;color:#fff;border-radius:8px">
          <tr><td style="padding:16px">
            <div style="display:inline-block;margin-bottom:8px;padding:4px 7px;background:#a9672e;border-radius:3px;font-size:11px;font-weight:bold">CONFIRMED${staySummary ? ` · ${escapeHtml(staySummary.toUpperCase())}` : ""}</div>
            <h1 style="margin:0 0 4px;font-size:20px">${safeHotelName}</h1>
            <p style="margin:0 0 12px;color:#d7deed">${formatDate(checkIn)} – ${formatDate(checkOut)}</p>
            <div style="border-top:1px solid #526080;padding-top:9px;color:#e5e9f3;font-size:12px">
              <span style="margin-right:12px">PNR: ${safePnr}</span>
              <span>Booking ID: ${safeBookingRef}</span>
            </div>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;border:1px solid #f0e5bf;background:#fffbef">
          <tr><td style="padding:12px;color:#5f6370;font-size:12px">
            <strong style="color:#a9672e">IMPORTANT INFORMATION</strong>
            <p style="margin:8px 0 4px">Please carry a valid government photo ID for check-in.</p>
            <p style="margin:4px 0">Review your booking voucher and the hotel's rules for stay and cancellation terms.</p>
          </td></tr>
        </table>

        <h2 style="padding-bottom:7px;border-bottom:1px solid #e1e6ee;font-size:14px">BOOKING DETAILS</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="7" style="border-collapse:collapse;font-size:13px">
          <tr><td style="color:#6b7488">Hotel</td><td><strong>${safeHotelName}</strong></td></tr>
          <tr><td style="color:#6b7488">Address</td><td>${safeAddress}</td></tr>
          <tr><td style="color:#6b7488">Check-in</td><td>${formatDate(checkIn)}</td></tr>
          <tr><td style="color:#6b7488">Check-out</td><td>${formatDate(checkOut)}</td></tr>
          <tr><td style="color:#6b7488">Rooms</td><td>${roomCount}</td></tr>
          <tr><td style="color:#6b7488">Guests</td><td>${safeGuests}</td></tr>
          ${safeVoucher ? `<tr><td style="color:#6b7488">Voucher number</td><td><strong>${safeVoucher}</strong></td></tr>` : ""}
          <tr><td style="color:#6b7488">Booking reference</td><td><strong>${safeBookingRef}</strong></td></tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="9" style="margin-top:12px;background:#e9fbf2;border:1px solid #c4eed9;color:#118454;font-weight:bold">
          <tr><td>Total amount paid</td><td align="right">${safeCurrency} ${safeAmount}</td></tr>
        </table>

        <p style="margin:18px 0 4px">Need help?</p>
        <p style="margin:0;color:#5e6880">Email <a href="mailto:support@destinoway.com" style="color:#1267b5">support@destinoway.com</a></p>
      </td></tr>
      <tr><td style="padding:14px;background:#f5f7fb;border-top:1px solid #e3e8ef;text-align:center;color:#8a95a8;font-size:11px">
        <p style="margin:0 0 4px">Please do not reply to this automated email.</p>
        <p style="margin:0">© ${new Date().getFullYear()} Destinoway. All rights reserved.</p>
      </td></tr>
    </table>
  </body>
</html>`;
};
