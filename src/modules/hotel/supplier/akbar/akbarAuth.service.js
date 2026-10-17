import "dotenv/config";
import axios from "axios";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import redisClient from "../../../../config/redis.js";
import { logHotelEvent } from "../../hotel/utils/hotelObservability.js";
import AkbarToken from "./akbarToken.model.js";

const AKBAR_TOKEN_KEY = "AKBAR:hotel:token";
const AKBAR_TOKEN_DOCUMENT_ID = "hotel";
const AKBAR_TOKEN_TTL = 10 * 24 * 60 * 60;
let tokenRefreshPromise;
let lastDatabaseSyncAt = 0;

const getEncryptionKey = () => {
  const configuredKey = process.env.AKBAR_TOKEN_ENCRYPTION_KEY;
  if (!configuredKey) return null;

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== 32) {
    throw new Error(
      "AKBAR_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    );
  }
  return key;
};

const encryptToken = (token, key) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encryptedToken = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedToken: encryptedToken.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
};

const decryptToken = (record, key) => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(record.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(record.encryptedToken, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const persistTokenToDatabase = async ({
  token,
  encryptionKey,
  expiresAt,
  force = false,
}) => {
  if (!encryptionKey) return;
  if (!force && Date.now() - lastDatabaseSyncAt < 60_000) return;

  try {
    const existing = await AkbarToken.findById(AKBAR_TOKEN_DOCUMENT_ID);
    if (existing && existing.expiresAt > new Date()) {
      try {
        const existingToken = decryptToken(existing, encryptionKey);
        const expiryDifference = Math.abs(
          existing.expiresAt.getTime() - expiresAt.getTime()
        );
        if (existingToken === token && expiryDifference < 60_000) {
          lastDatabaseSyncAt = Date.now();
          return;
        }
      } catch {
        // Replace records encrypted with a rotated key using the current Redis token.
      }
    }

    const encrypted = encryptToken(token, encryptionKey);
    await AkbarToken.findByIdAndUpdate(
      AKBAR_TOKEN_DOCUMENT_ID,
      { $set: { ...encrypted, expiresAt } },
      { upsert: true, returnDocument: "after" }
    );
    lastDatabaseSyncAt = Date.now();
    logHotelEvent("info", "hotel.supplier_token.database_write", {
      supplier: "AKBAR",
      tokenEncrypted: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.database_write_failed", {
      supplier: "AKBAR",
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return;
  }
};

const readRedisToken = async () => {
  try {
    const token = await redisClient.get(AKBAR_TOKEN_KEY);
    if (typeof token === "string" && token.trim()) {
      logHotelEvent("info", "hotel.supplier_token.cache_hit", {
        supplier: "AKBAR",
        key: AKBAR_TOKEN_KEY,
        redisReady: redisClient.isReady,
        tokenPresent: true,
      });
      let ttlSeconds;
      try {
        ttlSeconds = await redisClient.ttl(AKBAR_TOKEN_KEY);
      } catch (error) {
        logHotelEvent("error", "hotel.supplier_token.redis_ttl_failed", {
          supplier: "AKBAR",
          errorCode: error.code ?? null,
          errorMessage: error.message,
        });
      }
      return {
        token,
        ttlSeconds: Number.isInteger(ttlSeconds) ? ttlSeconds : null,
      };
    }
    logHotelEvent("warn", "hotel.supplier_token.cache_miss", {
      supplier: "AKBAR",
      key: AKBAR_TOKEN_KEY,
      redisReady: redisClient.isReady,
    });
    return null;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.redis_read_failed", {
      supplier: "AKBAR",
      key: AKBAR_TOKEN_KEY,
      redisReady: redisClient.isReady,
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return null;
  }
};

const readDatabaseToken = async (encryptionKey) => {
  if (!encryptionKey) {
    logHotelEvent("warn", "hotel.supplier_token.database_fallback_disabled", {
      supplier: "AKBAR",
      reason: "AKBAR_TOKEN_ENCRYPTION_KEY is not configured",
    });
    return null;
  }

  let record;
  try {
    record = await AkbarToken.findById(AKBAR_TOKEN_DOCUMENT_ID);
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.database_read_failed", {
      supplier: "AKBAR",
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return null;
  }
  if (!record || record.expiresAt <= new Date()) {
    logHotelEvent("info", "hotel.supplier_token.database_miss", {
      supplier: "AKBAR",
      recordFound: Boolean(record),
      recordExpired: Boolean(record && record.expiresAt <= new Date()),
    });
    return null;
  }

  let token;
  try {
    token = decryptToken(record, encryptionKey);
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.database_decrypt_failed", {
      supplier: "AKBAR",
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
    return null;
  }
  if (!token.trim()) return null;

  let redisRestored = false;
  try {
    const remainingTtl = Math.max(
      1,
      Math.floor((record.expiresAt.getTime() - Date.now()) / 1000)
    );
    await redisClient.set(AKBAR_TOKEN_KEY, token, { EX: remainingTtl });
    redisRestored = true;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.redis_restore_failed", {
      supplier: "AKBAR",
      errorCode: error.code ?? null,
      errorMessage: error.message,
    });
  }

  logHotelEvent("info", "hotel.supplier_token.database_hit", {
    supplier: "AKBAR",
    tokenPresent: true,
    redisRestored,
    expiresAt: record.expiresAt.toISOString(),
  });
  return token;
};

const createAndCacheToken = async (
  encryptionKey,
  { forceDatabaseWrite = false } = {}
) => {
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
        headers: { "Content-Type": "application/json" },
      }
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

  if (
    String(data?.Code) !== "200" ||
    typeof data?.Token !== "string" ||
    !data.Token.trim()
  ) {
    logHotelEvent("error", "hotel.supplier_request.rejected", {
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

  const expiresAt = new Date(Date.now() + AKBAR_TOKEN_TTL * 1000);
  await persistTokenToDatabase({
    token: data.Token,
    encryptionKey,
    expiresAt,
    force: forceDatabaseWrite,
  });
  if (!encryptionKey) {
    logHotelEvent("warn", "hotel.supplier_token.database_fallback_disabled", {
      supplier: "AKBAR",
      reason: "AKBAR_TOKEN_ENCRYPTION_KEY is not configured",
    });
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
      databaseFallbackAvailable: Boolean(encryptionKey),
    });
    if (!encryptionKey) throw error;
  }

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

export const getAKBARToken = async () => {
  let encryptionKey;
  try {
    encryptionKey = getEncryptionKey();
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.encryption_config_invalid", {
      supplier: "AKBAR",
      errorMessage: error.message,
    });
    encryptionKey = null;
  }

  const redisToken = await readRedisToken();
  if (redisToken) {
    await persistTokenToDatabase({
      token: redisToken.token,
      encryptionKey,
      expiresAt: new Date(
        Date.now() +
          (redisToken.ttlSeconds > 0
            ? redisToken.ttlSeconds
            : AKBAR_TOKEN_TTL) *
            1000
      ),
    });
    return redisToken.token;
  }

  const databaseToken = await readDatabaseToken(encryptionKey);
  if (databaseToken) return databaseToken;

  if (tokenRefreshPromise) return tokenRefreshPromise;
  tokenRefreshPromise = createAndCacheToken(encryptionKey);
  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = undefined;
  }
};

export const refreshAKBARTokenIfDue = async () => {
  let encryptionKey;
  try {
    encryptionKey = getEncryptionKey();
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.encryption_config_invalid", {
      supplier: "AKBAR",
      errorMessage: error.message,
    });
    encryptionKey = null;
  }

  const redisToken = await readRedisToken();
  let expiresAt =
    redisToken?.ttlSeconds > 0
      ? new Date(Date.now() + redisToken.ttlSeconds * 1000)
      : null;

  if (encryptionKey) {
    let databaseToken;
    try {
      databaseToken = await AkbarToken.findById(AKBAR_TOKEN_DOCUMENT_ID);
    } catch (error) {
      logHotelEvent("error", "hotel.supplier_token.database_read_failed", {
        supplier: "AKBAR",
        errorCode: error.code ?? null,
        errorMessage: error.message,
      });
      databaseToken = null;
    }
    if (
      databaseToken &&
      (!expiresAt || databaseToken.expiresAt < expiresAt)
    ) {
      expiresAt = databaseToken.expiresAt;
    }
  }

  if (!redisToken && (!expiresAt || expiresAt <= new Date())) {
    logHotelEvent("warn", "hotel.supplier_token.scheduled_refresh_missing", {
      supplier: "AKBAR",
      action: "request_token",
    });
    return getAKBARToken();
  }

  const refreshWindowMs = 60 * 60 * 1000;
  const remainingMs = expiresAt ? expiresAt.getTime() - Date.now() : 0;
  if (remainingMs > refreshWindowMs) {
    if (redisToken) {
      await persistTokenToDatabase({
        token: redisToken.token,
        encryptionKey,
        expiresAt,
      });
    }
    logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_skipped", {
      supplier: "AKBAR",
      remainingSeconds: Math.floor(remainingMs / 1000),
    });
    return null;
  }

  if (tokenRefreshPromise) return tokenRefreshPromise;
  logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_started", {
    supplier: "AKBAR",
    remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
  });
  tokenRefreshPromise = createAndCacheToken(encryptionKey, {
    forceDatabaseWrite: true,
  });
  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = undefined;
  }
};
