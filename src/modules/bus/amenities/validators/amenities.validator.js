const badRequest = (res, message) => res.status(400).json({
  success: false,
  message,
  data: null,
  meta: null,
});

export const validateBusAmenities = (req, res, next) => {
  const { tui, busServiceId } = req.body || {};
  if (typeof tui !== "string" || !tui.trim() || tui.length > 250) {
    return badRequest(res, "tui is required");
  }
  if (typeof busServiceId !== "string" || !busServiceId.trim() || busServiceId.length > 150) {
    return badRequest(res, "busServiceId is required");
  }
  next();
};
