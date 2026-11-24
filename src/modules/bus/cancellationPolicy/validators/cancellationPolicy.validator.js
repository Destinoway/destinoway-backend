const badRequest = (res, message) => res.status(400).json({
  success: false,
  message,
  data: null,
  meta: null,
});

export const validateBusCancellationPolicy = (req, res, next) => {
  const { tui, busServiceId } = req.body || {};
  if (typeof tui !== "string" || !tui.trim() || tui.length > 250) {
    return badRequest(res, "tui is required");
  }
  if (typeof busServiceId !== "string" || !/^\d{1,30}$/.test(busServiceId)) {
    return badRequest(res, "busServiceId must be a numeric string");
  }
  next();
};
