const ALLOWED_TYPES = ["from", "to", "popular"];
const MAX_TERM_LENGTH = 50;

const badRequest = (res, message) =>
  res.status(400).json({
    success: false,
    message,
    data: null,
    meta: null,
  });

// POST /api/v1/bus/stations
// Body: { term?: string, type?: "from" | "to" | "popular" }
export const validateBusStationsRequest = (req, res, next) => {
  const { term = "", type } = req.body || {};

  if (typeof term !== "string" || term.length > MAX_TERM_LENGTH) {
    return badRequest(
      res,
      `term must be a string of max ${MAX_TERM_LENGTH} characters`,
    );
  }

  if (type !== undefined && !ALLOWED_TYPES.includes(String(type).toLowerCase())) {
    return badRequest(res, `type must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }

  next();
};
