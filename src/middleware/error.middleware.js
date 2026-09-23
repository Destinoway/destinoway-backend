import { sendError } from "../utils/response/ApiResponse.js";

export const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  if (err.name === "CastError") {
    return sendError(res, "Invalid ID format", 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `${field} already exists`, 400);
  }

  return sendError(
    res,
    err.message || "Something went wrong",
    err.statusCode || 500,
    err.details || null,
  );
};
