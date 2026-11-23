const badRequest = (res, message) => res.status(400).json({ success: false, message, data: null, meta: null });

export const validateStartBusSearch = (req, res, next) => {
  const { from, to, onward } = req.body || {};
  if (![from, to].every((value) => typeof value === "string" && value.trim().length > 1 && value.length <= 100)) {
    return badRequest(res, "from and to must be city names of 2 to 100 characters");
  }
  if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
    return badRequest(res, "from and to must be different cities");
  }
  if (typeof onward !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(onward) || Number.isNaN(Date.parse(`${onward}T00:00:00Z`))) {
    return badRequest(res, "onward must be a valid date in YYYY-MM-DD format");
  }
  next();
};

export const validateBusSearchResults = (req, res, next) => {
  const { tui } = req.body || {};
  if (typeof tui !== "string" || !tui.trim() || tui.length > 250) {
    return badRequest(res, "tui is required");
  }
  next();
};
