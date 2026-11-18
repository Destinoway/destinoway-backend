import express from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";
import { getAkbarBusSession } from "./adapters/akbar/akbarBus.auth.js";

const router = express.Router();

// Health check: confirms the bus module is mounted and its config is present.
// Never returns secret values, only whether each key is set.
router.get("/health", (req, res) => {
  const requiredEnv = [
    "AKBAR_BUS_API_URL",
    "AKBAR_BUS_MERCHANT_ID",
    "AKBAR_BUS_API_KEY",
    "AKBAR_BUS_CLIENT_ID",
    "AKBAR_BUS_PASSWORD",
    "AKBAR_BUS_BROWSER_KEY",
    "AKBAR_BUS_KEY",
  ];

  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  return sendSuccess(res, "Bus module is running", {
    module: "bus",
    supplier: "AKBAR",
    configReady: missingEnv.length === 0,
    missingEnv,
  });
});

// DEV ONLY: checks that the AKBAR bus token can be created/read.
// ?refresh=true forces a new Signature call.
// The token itself is never returned.
router.get(
  "/auth/check",
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return sendError(res, "Not available", 404);
    }

    const session = await getAkbarBusSession({
      forceRefresh: req.query.refresh === "true",
    });

    return sendSuccess(res, "AKBAR bus token OK", {
      source: session.source,
      hasToken: Boolean(session.token),
      hasClientId: Boolean(session.clientId),
      createdAt: session.createdAt
        ? new Date(session.createdAt * 1000).toISOString()
        : null,
      expiresAt: session.expiresAt
        ? new Date(session.expiresAt * 1000).toISOString()
        : null,
    });
  }),
);

export default router;
