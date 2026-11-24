const badRequest = (res, message) => res.status(400).json({ success: false, message, data: null, meta: null });

export const validateBusSeatLayout = (req, res, next) => {
  const { tui, busServiceId, journeyDate, providerCode } = req.body || {};
  if (typeof tui !== "string" || !tui.trim() || tui.length > 250) return badRequest(res, "tui is required");
  if (typeof busServiceId !== "string" || !busServiceId.trim() || busServiceId.length > 150) return badRequest(res, "busServiceId is required");
  if (typeof journeyDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate) || Number.isNaN(Date.parse(`${journeyDate}T00:00:00Z`))) return badRequest(res, "journeyDate must be YYYY-MM-DD");
  if (typeof providerCode !== "string" || !/^[A-Za-z0-9]{1,20}$/.test(providerCode)) return badRequest(res, "providerCode is required");
  next();
};
