import "dotenv/config";
import axios from "axios";
import redisClient from "../../../../config/redis.js";
import { logHotelEvent } from "../../hotel/utils/hotelObservability.js";

const AKBAR_TOKEN_KEY = "AKBAR:hotel:token";
const AKBAR_TOKEN_TTL = 10 * 24 * 60 * 60; // 10 days
let tokenRefreshPromise;

export const getAKBARToken = async () => {
  let cachedToken;
  try {
    cachedToken = await redisClient.get(AKBAR_TOKEN_KEY);
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.redis_read_failed", {
      supplier: "AKBAR",
      key: AKBAR_TOKEN_KEY,
      redisReady: redisClient.isReady,
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    throw error;
  }

  if (typeof cachedToken === "string" && cachedToken.trim()) {
    logHotelEvent("info", "hotel.supplier_token.cache_hit", {
      supplier: "AKBAR",
      key: AKBAR_TOKEN_KEY,
      redisReady: redisClient.isReady,
      tokenPresent: true,
    });
    return cachedToken;
  }

  logHotelEvent("warn", "hotel.supplier_token.cache_miss", {
    supplier: "AKBAR",
    key: AKBAR_TOKEN_KEY,
    redisReady: redisClient.isReady,
  });

  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = createAndCacheToken();
  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = undefined;
  }
};

const createAndCacheToken = async () => {
  const configuredUrl = process.env.AKBAR_SIGNATURE_URL;
  let signatureUrl;
  try {
    if (!configuredUrl) {
      throw new Error("AKBAR_SIGNATURE_URL is not configured");
    }
    signatureUrl = new URL(configuredUrl.trim());
    if (signatureUrl.protocol !== "https:" || !signatureUrl.hostname) {
      throw new Error("AKBAR_SIGNATURE_URL must be a valid HTTPS URL");
    }
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_config.invalid", {
      supplier: "AKBAR",
      operation: "signature",
      variable: "AKBAR_SIGNATURE_URL",
      configured: Boolean(configuredUrl),
      valueLength: configuredUrl?.length ?? 0,
      containsWhitespace: configuredUrl ? /\s/.test(configuredUrl) : false,
      trimmedWhitespace: configuredUrl
        ? configuredUrl !== configuredUrl.trim()
        : false,
      errorName: error.name,
      errorMessage: error.message,
    });
    error.statusCode = 503;
    throw error;
  }

  logHotelEvent("info", "hotel.supplier_config.validated", {
    supplier: "AKBAR",
    operation: "signature",
    variable: "AKBAR_SIGNATURE_URL",
    protocol: signatureUrl.protocol,
    host: signatureUrl.host,
    path: signatureUrl.pathname,
  });

  const startedAt = performance.now();
  let data;
  try {
    ({ data } = await axios.post(
      signatureUrl.toString(),
      {
        MerchantID: process.env.AKBAR_MERCHANT_ID,
        ApiKey: process.env.AKBAR_API_KEY,
        ClientID: process.env.AKBAR_CLIENT_ID,
        Password: process.env.AKBAR_PASSWORD,
        AgentCode: process.env.AKBAR_AGENT_CODE,
        BrowserKey: process.env.AKBAR_BROWSER_KEY,
        Key: process.env.AKBAR_KEY,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    ));
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_request.failed", {
      supplier: "AKBAR",
      operation: "signature",
      host: signatureUrl.host,
      path: signatureUrl.pathname,
      httpStatus: error.response?.status ?? null,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    throw error;
  }

  if (String(data?.Code) !== "200" || typeof data?.Token !== "string" || !data.Token.trim()) {
    logHotelEvent("error", "hotel.supplier_request.rejected", {
      supplier: "AKBAR",
      operation: "signature",
      host: signatureUrl.host,
      path: signatureUrl.pathname,
      durationMs: Math.round(performance.now() - startedAt),
      supplierCode: data?.Code ?? null,
      supplierMessage: typeof data?.Msg === "string" ? data.Msg.slice(0, 200) : null,
      hasToken: Boolean(data?.Token),
    });
    throw new Error("Failed to generate AKBAR token");
  }

  // 3. Save token in Redis for 10 days
  await redisClient.set(AKBAR_TOKEN_KEY, data.Token, {
    EX: AKBAR_TOKEN_TTL,
  });

  logHotelEvent("info", "hotel.supplier_request.completed", {
    supplier: "AKBAR",
    operation: "signature",
    host: signatureUrl.host,
    path: signatureUrl.pathname,
    durationMs: Math.round(performance.now() - startedAt),
    supplierCode: data.Code,
    tokenCached: true,
  });
  logHotelEvent("info", "hotel.supplier_token.cache_write", {
    supplier: "AKBAR",
    key: AKBAR_TOKEN_KEY,
    redisReady: redisClient.isReady,
    ttlSeconds: AKBAR_TOKEN_TTL,
    tokenPresent: true,
  });

  return data.Token;
};
