import { getAkbarBusSession } from "../supplier/akbar/akbarBus.auth.js";

const REQUIRED_ENV = [
  "AKBAR_BUS_API_URL",
  "AKBAR_BUS_MERCHANT_ID",
  "AKBAR_BUS_API_KEY",
  "AKBAR_BUS_CLIENT_ID",
  "AKBAR_BUS_PASSWORD",
  "AKBAR_BUS_BROWSER_KEY",
  "AKBAR_BUS_KEY",
];

const toIso = (seconds) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

// Which bus env keys are missing (never returns the values).
export const getBusHealthService = () => {
  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

  return {
    module: "bus",
    supplier: "AKBAR",
    configReady: missingEnv.length === 0,
    missingEnv,
  };
};

// Gets the AKBAR bus token (from DB or a new Signature call).
// Returns only safe info, never the token itself.
export const checkBusSignatureService = async ({ refresh = false } = {}) => {
  const session = await getAkbarBusSession({ forceRefresh: refresh });

  return {
    source: session.source,
    hasToken: Boolean(session.token),
    hasClientId: Boolean(session.clientId),
    createdAt: toIso(session.createdAt),
    expiresAt: toIso(session.expiresAt),
  };
};
