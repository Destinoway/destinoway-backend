const badRequest = (res, message) => res.status(400).json({ success: false, message, data: null, meta: null });
const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

export const validateBusTravelItinerary = (req, res, next) => {
  const { tui, busServiceId, seatName, buid, duid, passenger, contact } = req.body || {};
  if (!text(tui, 250) || !text(busServiceId, 150) || !text(seatName, 30)) return badRequest(res, "tui, busServiceId and seatName are required");
  if (![buid, duid].every((value) => (typeof value === "string" && /^\d+$/.test(value)) || (Number.isSafeInteger(value) && value > 0))) return badRequest(res, "buid and duid must be positive IDs");
  if (!passenger || !["Mr", "Ms", "Mrs"].includes(passenger.title) || !text(passenger.firstName, 80) || !text(passenger.lastName, 80) || !Number.isInteger(passenger.age) || passenger.age < 12 || passenger.age > 120) return badRequest(res, "valid adult passenger details are required");
  if (!contact || !text(contact.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || !/^\d{10}$/.test(contact.phone)) return badRequest(res, "valid email and 10-digit phone are required");
  next();
};
