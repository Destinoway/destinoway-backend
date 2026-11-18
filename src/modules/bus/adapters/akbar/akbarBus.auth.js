import axios from "axios";
import redisClient from "../../../../config/redis.js";

// =========================================================
// AKBAR BUS AUTH (Signature API)
//
// Signature returns:
//   - Token    : JWT (valid ~100 days in test env)
//   - ClientID : encrypted id that must be sent in EVERY bus API
//
// Both are cached together in Redis as one "session".
// =========================================================

const SESSION_KEY = "AKBAR:bus:session";

// Refresh the token this long before the JWT actually expires.
const EXPIRY_BUFFER_SECONDS = 24 * 60 * 60; // 1 day

// Used only if the JWT has no readable "exp".
const FALLBACK_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const SIGNATURE_TIMEOUT_MS = 20000;

// If several requests need a token at the same time, only one
// Signature call is made and the others wait for it.
let inFlightSignature = null;

// Reads "exp" (seconds) from a JWT without verifying it.
const getJwtExpiry = (token) => {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const exp = Number(JSON.parse(json)?.exp);

    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
};

const readCachedSession = async () => {
  try {
    const cached = await redisClient.get(SESSION_KEY);

    if (!cached) return null;

    const session = JSON.parse(cached);

    if (!session?.token || !session?.clientId) return null;

    // Treat as expired if it's within the buffer window.
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (
      session.expiresAt &&
      session.expiresAt - EXPIRY_BUFFER_SECONDS <= nowSeconds
    ) {
      return null;
    }

    return session;
  } catch (error) {
    // Redis down / bad JSON: just fetch a fresh token.
    console.error("AKBAR BUS: Redis read failed:", error.message);
    return null;
  }
};

const saveSession = async (session) => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const ttl = session.expiresAt
    ? session.expiresAt - nowSeconds - EXPIRY_BUFFER_SECONDS
    : FALLBACK_TTL_SECONDS;

  if (ttl <= 0) return;

  try {
    await redisClient.set(SESSION_KEY, JSON.stringify(session), {
      EX: ttl,
    });
  } catch (error) {
    console.error("AKBAR BUS: Redis write failed:", error.message);
  }
};

const callSignatureAPI = async () => {
  const url = `${process.env.AKBAR_BUS_API_URL}/Utils/Signature`;

  let data;

  try {
    ({ data } = await axios.post(
      url,
      {
        MerchantID: process.env.AKBAR_BUS_MERCHANT_ID,
        ApiKey: process.env.AKBAR_BUS_API_KEY,
        ClientID: process.env.AKBAR_BUS_CLIENT_ID,
        Password: process.env.AKBAR_BUS_PASSWORD,
        AgentCode: process.env.AKBAR_BUS_AGENT_CODE || "",
        BrowserKey: process.env.AKBAR_BUS_BROWSER_KEY,
        Key: process.env.AKBAR_BUS_KEY,
        IsMasked: true,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: SIGNATURE_TIMEOUT_MS,
      },
    ));
  } catch (error) {
    const timedOut = error.code === "ECONNABORTED";
    const status = error.response?.status;

    const signatureError = new Error(
      timedOut
        ? "AKBAR bus signature timed out (server not reachable - check IP whitelisting)"
        : `AKBAR bus signature failed${status ? ` (HTTP ${status})` : `: ${error.message}`}`,
    );
    signatureError.statusCode = timedOut ? 504 : 502;
    throw signatureError;
  }

  if (String(data?.Code) !== "200" || !data?.Token || !data?.ClientID) {
    const reason = Array.isArray(data?.Msg) ? data.Msg.join(", ") : data?.Msg;

    const error = new Error(
      `AKBAR bus signature failed${reason ? `: ${reason}` : ""}`,
    );
    error.statusCode = 502;
    throw error;
  }

  return {
    token: data.Token,
    clientId: data.ClientID,
    tui: data.TUI || null,
    expiresAt: getJwtExpiry(data.Token),
    createdAt: Math.floor(Date.now() / 1000),
  };
};

const createNewSession = async () => {
  if (!inFlightSignature) {
    inFlightSignature = (async () => {
      console.log("AKBAR BUS: calling Signature API for a new token");

      const session = await callSignatureAPI();
      await saveSession(session);

      console.log("AKBAR BUS: new token saved");
      return session;
    })().finally(() => {
      inFlightSignature = null;
    });
  }

  return inFlightSignature;
};

/**
 * Returns { token, clientId, tui, expiresAt, createdAt, source }.
 * source = "cache" | "signature"
 *
 * forceRefresh: ignore the cached token (used after a 401).
 */
export const getAkbarBusSession = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = await readCachedSession();

    if (cached) {
      return { ...cached, source: "cache" };
    }
  }

  const session = await createNewSession();
  return { ...session, source: "signature" };
};

/**
 * Removes the cached session (e.g. when AKBAR rejects the token).
 */
export const clearAkbarBusSession = async () => {
  try {
    await redisClient.del(SESSION_KEY);
  } catch (error) {
    console.error("AKBAR BUS: Redis delete failed:", error.message);
  }
};
