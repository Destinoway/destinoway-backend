import axios from "axios";
import { randomUUID } from "node:crypto";
import AkbarBusToken from "./akbarBusToken.model.js";
import { logBusEvent } from "../../utils/busLogger.js";

// =========================================================
// AKBAR BUS AUTH (Signature API)
//
// Signature returns:
//   - Token    : JWT (valid ~100 days in test env)
//   - ClientID : encrypted id that must be sent in EVERY bus API
//
// Both are saved in MongoDB "akbartokens" collection, doc _id "bus"
// (same collection hotel uses with _id "hotel").
// =========================================================

const SIGNATURE_TIMEOUT_MS = 20000;

// Keep the token for 10 days (same as hotel), then get a new one.
const TOKEN_TTL_SECONDS = 10 * 24 * 60 * 60; // 10 days

// Safety: if AKBAR's JWT expires sooner than 10 days,
// refresh 1 day before that instead.
const EXPIRY_BUFFER_SECONDS = 24 * 60 * 60; // 1 day

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

const toSeconds = (date) => (date ? Math.floor(date.getTime() / 1000) : null);

const readStoredSession = async () => {
  try {
    const record = await AkbarBusToken.findById("bus").lean();

    if (!record?.token || !record?.clientId) return null;

    // expiresAt is already the refresh time, so just compare with now.
    if (!record.expiresAt || record.expiresAt <= new Date()) return null;

    return {
      token: record.token,
      clientId: record.clientId,
      signatureTui: record.signatureTui || null,
      expiresAt: toSeconds(record.expiresAt),
      createdAt: toSeconds(record.updatedAt || record.createdAt),
    };
  } catch (error) {
    // DB issue: fall back to a fresh Signature call.
    console.error("AKBAR BUS: token read from DB failed:", error.message);
    return null;
  }
};

const saveSession = async ({ token, clientId, signatureTui }) => {
  const jwtExpiry = getJwtExpiry(token);
  const nowSeconds = Math.floor(Date.now() / 1000);

  const tenDaysLater = nowSeconds + TOKEN_TTL_SECONDS;

  const refreshAtSeconds = jwtExpiry
    ? Math.min(tenDaysLater, jwtExpiry - EXPIRY_BUFFER_SECONDS)
    : tenDaysLater;

  const expiresAt = new Date(refreshAtSeconds * 1000);

  try {
    await AkbarBusToken.findByIdAndUpdate(
      "bus",
      { token, clientId, signatureTui, expiresAt },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    // Token is still usable for this request even if saving failed.
    console.error("AKBAR BUS: token save to DB failed:", error.message);
  }

  return {
    token,
    clientId,
    signatureTui,
    expiresAt: refreshAtSeconds,
    createdAt: nowSeconds,
  };
};

// Removes spaces, wrapping quotes and trailing "/" from an env URL.
const cleanUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");

// AKBAR_BUS_SIGNATURE_URL (optional) = full Signature URL, if AKBAR
// hosts it somewhere else. Default: <AKBAR_BUS_API_URL>/Utils/Signature
const getSignatureUrl = () =>
  cleanUrl(process.env.AKBAR_BUS_SIGNATURE_URL) ||
  `${cleanUrl(process.env.AKBAR_BUS_API_URL)}/Utils/Signature`;

// Exclude URL credentials, query parameters and fragments from errors/logs.
const safeUrl = (url) => {
  try {
    const { origin, pathname } = new URL(url);
    return `${origin}${pathname}`;
  } catch {
    return "invalid URL";
  }
};

const callSignatureAPI = async () => {
  const url = getSignatureUrl();
  const exchangeId = randomUUID();
  const startedAt = Date.now();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const payload = {
    MerchantID: process.env.AKBAR_BUS_MERCHANT_ID,
    ApiKey: process.env.AKBAR_BUS_API_KEY,
    ClientID: process.env.AKBAR_BUS_CLIENT_ID,
    Password: process.env.AKBAR_BUS_PASSWORD,
    AgentCode: process.env.AKBAR_BUS_AGENT_CODE || "",
    BrowserKey: process.env.AKBAR_BUS_BROWSER_KEY,
    Key: process.env.AKBAR_BUS_KEY,
  };
  const context = { exchangeId, method: "POST", endpoint: safeUrl(url) };

  await logBusEvent("request", {
    ...context,
    headers,
    request: { body: payload },
    timeoutMs: SIGNATURE_TIMEOUT_MS,
  });

  let data;

  try {
    const response = await axios.post(url, payload, {
      headers,
      timeout: SIGNATURE_TIMEOUT_MS,
    });
    data = response.data;
    await logBusEvent("response", {
      ...context,
      durationMs: Date.now() - startedAt,
      status: response.status,
      headers: response.headers,
      response: data,
    });
  } catch (error) {
    const timedOut = error.code === "ECONNABORTED";
    const status = error.response?.status;
    await logBusEvent("error", {
      ...context,
      durationMs: Date.now() - startedAt,
      status: status ?? null,
      errorCode: error.code ?? null,
      timedOut,
      headers: error.response?.headers ?? {},
      response: error.response?.data ?? null,
    });

    const signatureError = new Error(
      timedOut
        ? "AKBAR bus signature timed out before receiving a response"
        : `AKBAR bus signature failed${status ? ` (HTTP ${status})` : `: ${error.message}`} at ${safeUrl(url)}`,
    );
    signatureError.statusCode = timedOut ? 504 : 502;
    throw signatureError;
  }

  if (String(data?.Code) !== "200" || !data?.Token || !data?.ClientID) {
    await logBusEvent("validation_failed", {
      ...context,
      durationMs: Date.now() - startedAt,
      supplierCode: data?.Code ?? null,
      hasToken: Boolean(data?.Token),
      hasClientId: Boolean(data?.ClientID),
    });
    const reason = Array.isArray(data?.Msg) ? data.Msg.join(", ") : data?.Msg;

    const error = new Error(
      `AKBAR bus signature failed${reason ? `: ${reason}` : ""}`,
    );
    error.statusCode = 502;
    throw error;
  }

  return { token: data.Token, clientId: data.ClientID, signatureTui: data.TUI || null };
};

const createNewSession = async () => {
  if (!inFlightSignature) {
    inFlightSignature = (async () => {
      console.log("AKBAR BUS: calling Signature API for a new token");

      const signature = await callSignatureAPI();
      const session = await saveSession(signature);

      console.log("AKBAR BUS: new token saved to DB");
      return session;
    })().finally(() => {
      inFlightSignature = null;
    });
  }

  return inFlightSignature;
};

/**
 * Returns { token, clientId, expiresAt, createdAt, source }.
 * source = "db" | "signature"
 *
 * forceRefresh: ignore the stored token (used after a 401).
 */
export const getAkbarBusSession = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const stored = await readStoredSession();

    if (stored) {
      await logBusEvent("cache_hit", {
        sessionSource: "db",
        expiresAt: stored.expiresAt,
      });
      return { ...stored, source: "db" };
    }
  }

  const session = await createNewSession();
  return { ...session, source: "signature" };
};

/**
 * Removes the stored token (e.g. when AKBAR rejects it).
 */
export const clearAkbarBusSession = async () => {
  try {
    await AkbarBusToken.deleteOne({ _id: "bus" });
  } catch (error) {
    console.error("AKBAR BUS: token delete from DB failed:", error.message);
  }
};
