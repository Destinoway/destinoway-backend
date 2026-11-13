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

  return `
  `;
};
