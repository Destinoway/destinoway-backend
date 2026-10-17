import "dotenv/config";
import axios from "axios";
import redisClient, { redisConnectionInfo } from "../../../../config/redis.js";
import { logHotelEvent } from "../../hotel/utils/hotelObservability.js";

const AKBAR_TOKEN_KEY = "AKBAR:hotel:token";
const AKBAR_TOKEN_TTL = 10 * 24 * 60 * 60;
let tokenRefreshPromise;

const readRedisToken = async (context = {}) => {
  try {
    const token = await redisClient.get(AKBAR_TOKEN_KEY);
    if (typeof token === "string" && token.trim()) {
      logHotelEvent("info", "hotel.supplier_token.cache_hit", {
        ...context,
        supplier: "AKBAR",
        operation: context.operation ?? context.tokenRequestedBy ?? null,
        processId: process.pid,
        key: AKBAR_TOKEN_KEY,
        redisReady: redisClient.isReady,
        ...redisConnectionInfo,
        tokenPresent: true,
      });
      let ttlSeconds;
      try {
        ttlSeconds = await redisClient.ttl(AKBAR_TOKEN_KEY);
      } catch (error) {
        logHotelEvent("error", "hotel.supplier_token.redis_ttl_failed", {
          ...context,
          supplier: "AKBAR",
          key: AKBAR_TOKEN_KEY,
          ...redisConnectionInfo,
          errorCode: error.code ?? null,
          errorMessage: error.message,
        });
        error.statusCode = error.statusCode ?? 503;
        throw error;
      }
      return {
        token,
        ttlSeconds: Number.isInteger(ttlSeconds) ? ttlSeconds : null,
      };
    }
    logHotelEvent("warn", "hotel.supplier_token.cache_miss", {
      ...context,
      supplier: "AKBAR",
      operation: context.operation ?? context.tokenRequestedBy ?? null,
      processId: process.pid,
      key: AKBAR_TOKEN_KEY,
      redisReady: redisClient.isReady,
      ...redisConnectionInfo,
    });
    return null;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.redis_read_failed", {
      ...context,
      supplier: "AKBAR",
      operation: context.operation ?? context.tokenRequestedBy ?? null,
      processId: process.pid,
      key: AKBAR_TOKEN_KEY,
      redisReady: redisClient.isReady,
      ...redisConnectionInfo,
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    error.statusCode = error.statusCode ?? 503;
    throw error;
  }
};

const createAndCacheToken = async (context = {}) => {
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
      ...context,
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
    ...context,
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
        headers: { "Content-Type": "application/json" },
      }
    ));
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_request.failed", {
      ...context,
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

  if (
    String(data?.Code) !== "200" ||
    typeof data?.Token !== "string" ||
    !data.Token.trim()
  ) {
    logHotelEvent("error", "hotel.supplier_request.rejected", {
      ...context,
      supplier: "AKBAR",
      operation: "signature",
      host: signatureUrl.host,
      path: signatureUrl.pathname,
      durationMs: Math.round(performance.now() - startedAt),
      supplierCode: data?.Code ?? null,
      supplierMessage:
        typeof data?.Msg === "string" ? data.Msg.slice(0, 200) : null,
      hasToken: Boolean(data?.Token),
    });
    throw new Error("Failed to generate AKBAR token");
  }

  try {
    await redisClient.set(AKBAR_TOKEN_KEY, data.Token, {
      EX: AKBAR_TOKEN_TTL,
    });
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.redis_write_failed", {
      supplier: "AKBAR",
      errorCode: error.code ?? null,
      errorMessage: error.message,
      ...redisConnectionInfo,
    });
    error.statusCode = error.statusCode ?? 503;
    throw error;
  }

  logHotelEvent("info", "hotel.supplier_request.completed", {
    ...context,
    supplier: "AKBAR",
    operation: "signature",
    host: signatureUrl.host,
    path: signatureUrl.pathname,
    durationMs: Math.round(performance.now() - startedAt),
    supplierCode: data.Code,
    tokenCached: true,
  });
  logHotelEvent("info", "hotel.supplier_token.cache_write", {
    ...context,
    supplier: "AKBAR",
    processId: process.pid,
    key: AKBAR_TOKEN_KEY,
    redisReady: redisClient.isReady,
    ...redisConnectionInfo,
    ttlSeconds: AKBAR_TOKEN_TTL,
    tokenPresent: true,
  });
  return data.Token;
};

export const getAKBARToken = async ({
  operation = "unspecified",
  correlationId,
} = {}) => {
  const context = {
    tokenRequestedBy: operation,
    correlationId,
    processId: process.pid,
  };
  logHotelEvent("info", "hotel.supplier_token.lookup_started", {
    ...context,
    supplier: "AKBAR",
    operation: "token_lookup",
    key: AKBAR_TOKEN_KEY,
    redisReady: redisClient.isReady,
    ...redisConnectionInfo,
  });
  const redisToken = await readRedisToken(context);
  if (redisToken?.ttlSeconds > 0) {
    logHotelEvent("info", "hotel.supplier_token.resolved", {
      ...context,
      supplier: "AKBAR",
      operation: "token_lookup",
      source: "redis",
      tokenPresent: true,
    });
    return redisToken.token;
  }
  if (redisToken) {
    logHotelEvent("warn", "hotel.supplier_token.cache_entry_without_ttl", {
      ...context,
      supplier: "AKBAR",
      key: AKBAR_TOKEN_KEY,
      ...redisConnectionInfo,
    });
  }

  if (tokenRefreshPromise) return tokenRefreshPromise;
  tokenRefreshPromise = createAndCacheToken(context);
  try {
    const token = await tokenRefreshPromise;
    logHotelEvent("info", "hotel.supplier_token.resolved", {
      ...context,
      supplier: "AKBAR",
      operation: "token_lookup",
      source: "signature",
      tokenPresent: true,
    });
    return token;
  } finally {
    tokenRefreshPromise = undefined;
  }
};

export const refreshAKBARTokenIfDue = async () => {
  const redisToken = await readRedisToken({
    tokenRequestedBy: "scheduled_refresh",
    processId: process.pid,
  });
  const refreshWindowMs = 60 * 60 * 1000;
  const remainingMs = (redisToken?.ttlSeconds ?? 0) * 1000;
  if (remainingMs > refreshWindowMs) {
    logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_skipped", {
      supplier: "AKBAR",
      remainingSeconds: Math.floor(remainingMs / 1000),
    });
    return null;
  }

  if (tokenRefreshPromise) return tokenRefreshPromise;
  logHotelEvent(
    redisToken ? "info" : "warn",
    "hotel.supplier_token.scheduled_refresh_started",
    {
      supplier: "AKBAR",
      redisEntryPresent: Boolean(redisToken),
      ...redisConnectionInfo,
      remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
    }
  );
  tokenRefreshPromise = createAndCacheToken({
    tokenRequestedBy: "scheduled_refresh",
    processId: process.pid,
  });
  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = undefined;
  }
};
