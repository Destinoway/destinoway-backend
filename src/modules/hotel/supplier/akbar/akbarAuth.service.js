
// import "dotenv/config";
// import axios from "axios";
// import redisClient, { redisConnectionInfo } from "../../../../config/redis.js";
// import { logHotelEvent } from "../../hotel/utils/hotelObservability.js";

// const AKBAR_TOKEN_KEY = "AKBAR:hotel:token";
// const AKBAR_TOKEN_TTL = 10 * 24 * 60 * 60;
// const AKBAR_SIGNATURE_TIMEOUT_MS = 30000;

// let tokenRefreshPromise;

// const getErrorDetails = (error) => ({
//   errorName: error?.name ?? null,
//   errorCode: error?.code ?? null,
//   errorMessage: error?.message ?? null,
//   httpStatus: error?.response?.status ?? null,
// });

// const readRedisToken = async (context = {}) => {
//   const startedAt = performance.now();

//   logHotelEvent("info", "hotel.supplier_token.redis_read_started", {
//     ...context,
//     supplier: "AKBAR",
//     key: AKBAR_TOKEN_KEY,
//     processId: process.pid,
//     redisReady: redisClient.isReady,
//     ...redisConnectionInfo,
//   });

//   try {
//     const token = await redisClient.get(AKBAR_TOKEN_KEY);

//     if (typeof token === "string" && token.trim()) {
//       let ttlSeconds;

//       try {
//         ttlSeconds = await redisClient.ttl(AKBAR_TOKEN_KEY);
//       } catch (error) {
//         logHotelEvent("error", "hotel.supplier_token.redis_ttl_failed", {
//           ...context,
//           supplier: "AKBAR",
//           key: AKBAR_TOKEN_KEY,
//           durationMs: Math.round(performance.now() - startedAt),
//           ...redisConnectionInfo,
//           ...getErrorDetails(error),
//         });

//         error.statusCode = error.statusCode ?? 503;
//         throw error;
//       }

//       logHotelEvent("info", "hotel.supplier_token.cache_hit", {
//         ...context,
//         supplier: "AKBAR",
//         operation: context.operation ?? context.tokenRequestedBy ?? null,
//         processId: process.pid,
//         key: AKBAR_TOKEN_KEY,
//         redisReady: redisClient.isReady,
//         durationMs: Math.round(performance.now() - startedAt),
//         ttlSeconds,
//         tokenPresent: true,
//         ...redisConnectionInfo,
//       });

//       return {
//         token,
//         ttlSeconds: Number.isInteger(ttlSeconds) ? ttlSeconds : null,
//       };
//     }

//     logHotelEvent("warn", "hotel.supplier_token.cache_miss", {
//       ...context,
//       supplier: "AKBAR",
//       operation: context.operation ?? context.tokenRequestedBy ?? null,
//       processId: process.pid,
//       key: AKBAR_TOKEN_KEY,
//       redisReady: redisClient.isReady,
//       durationMs: Math.round(performance.now() - startedAt),
//       tokenPresent: false,
//       ...redisConnectionInfo,
//     });

//     return null;
//   } catch (error) {
//     logHotelEvent("error", "hotel.supplier_token.redis_read_failed", {
//       ...context,
//       supplier: "AKBAR",
//       operation: context.operation ?? context.tokenRequestedBy ?? null,
//       processId: process.pid,
//       key: AKBAR_TOKEN_KEY,
//       redisReady: redisClient.isReady,
//       durationMs: Math.round(performance.now() - startedAt),
//       ...redisConnectionInfo,
//       ...getErrorDetails(error),
//     });

//     error.statusCode = error.statusCode ?? 503;
//     throw error;
//   }
// };

// const createAndCacheToken = async (context = {}) => {
//   const signatureStartedAt = performance.now();
//   const configuredUrl = process.env.AKBAR_SIGNATURE_URL;

//   let signatureUrl;

//   try {
//     if (!configuredUrl) {
//       throw new Error("AKBAR_SIGNATURE_URL is not configured");
//     }

//     signatureUrl = new URL(configuredUrl.trim());

//     if (
//       signatureUrl.protocol !== "https:" ||
//       !signatureUrl.hostname
//     ) {
//       throw new Error("AKBAR_SIGNATURE_URL must be a valid HTTPS URL");
//     }
//   } catch (error) {
//     logHotelEvent("error", "hotel.supplier_config.invalid", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "signature",
//       variable: "AKBAR_SIGNATURE_URL",
//       configured: Boolean(configuredUrl),
//       valueLength: configuredUrl?.length ?? 0,
//       containsWhitespace: configuredUrl
//         ? /\s/.test(configuredUrl)
//         : false,
//       trimmedWhitespace: configuredUrl
//         ? configuredUrl !== configuredUrl.trim()
//         : false,
//       ...getErrorDetails(error),
//     });

//     error.statusCode = 503;
//     throw error;
//   }

//   logHotelEvent("info", "hotel.signature.request_started", {
//     ...context,
//     supplier: "AKBAR",
//     operation: "signature",
//     method: "POST",
//     protocol: signatureUrl.protocol,
//     host: signatureUrl.host,
//     path: signatureUrl.pathname,
//     hasQuery: Boolean(signatureUrl.search),
//     timeoutMs: AKBAR_SIGNATURE_TIMEOUT_MS,
//     processId: process.pid,
//   });

//   let data;

//   try {
//     const response = await axios.post(
//       signatureUrl.toString(),
//       {
//         MerchantID: process.env.AKBAR_MERCHANT_ID,
//         ApiKey: process.env.AKBAR_API_KEY,
//         ClientID: process.env.AKBAR_CLIENT_ID,
//         Password: process.env.AKBAR_PASSWORD,
//         AgentCode: process.env.AKBAR_AGENT_CODE,
//         BrowserKey: process.env.AKBAR_BROWSER_KEY,
//         Key: process.env.AKBAR_KEY,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//         timeout: AKBAR_SIGNATURE_TIMEOUT_MS,
//       }
//     );

//     data = response.data;

//     logHotelEvent("info", "hotel.signature.response_received", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "signature",
//       host: signatureUrl.host,
//       path: signatureUrl.pathname,
//       httpStatus: response.status,
//       durationMs: Math.round(performance.now() - signatureStartedAt),
//       responseBodyPresent: data !== null && data !== undefined,
//       responseBodyType: Array.isArray(data) ? "array" : typeof data,
//     });
//   } catch (error) {
//     logHotelEvent("error", "hotel.signature.request_failed", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "signature",
//       method: "POST",
//       host: signatureUrl.host,
//       path: signatureUrl.pathname,
//       httpStatus: error.response?.status ?? null,
//       durationMs: Math.round(performance.now() - signatureStartedAt),
//       timeoutMs: AKBAR_SIGNATURE_TIMEOUT_MS,
//       ...getErrorDetails(error),
//     });

//     logHotelEvent("error", "hotel.supplier_request.failed", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "signature",
//       host: signatureUrl.host,
//       path: signatureUrl.pathname,
//       httpStatus: error.response?.status ?? null,
//       durationMs: Math.round(performance.now() - signatureStartedAt),
//       ...getErrorDetails(error),
//     });

//     throw error;
//   }

//   if (
//     String(data?.Code) !== "200" ||
//     typeof data?.Token !== "string" ||
//     !data.Token.trim()
//   ) {
//     logHotelEvent("error", "hotel.signature.response_rejected", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "signature",
//       host: signatureUrl.host,
//       path: signatureUrl.pathname,
//       durationMs: Math.round(performance.now() - signatureStartedAt),
//       supplierCode: data?.Code ?? null,
//       supplierMessage:
//         typeof data?.Msg === "string"
//           ? data.Msg.slice(0, 200)
//           : null,
//       tokenPresent: Boolean(data?.Token),
//     });

//     const error = new Error("Failed to generate AKBAR token");
//     error.statusCode = 502;
//     throw error;
//   }

//   const redisWriteStartedAt = performance.now();

//   logHotelEvent("info", "hotel.supplier_token.redis_write_started", {
//     ...context,
//     supplier: "AKBAR",
//     key: AKBAR_TOKEN_KEY,
//     processId: process.pid,
//     ttlSeconds: AKBAR_TOKEN_TTL,
//     ...redisConnectionInfo,
//   });

//   try {
//     await redisClient.set(AKBAR_TOKEN_KEY, data.Token, {
//       EX: AKBAR_TOKEN_TTL,
//     });

//     const savedTtl = await redisClient.ttl(AKBAR_TOKEN_KEY);

//     logHotelEvent("info", "hotel.supplier_token.cache_write", {
//       ...context,
//       supplier: "AKBAR",
//       processId: process.pid,
//       key: AKBAR_TOKEN_KEY,
//       redisReady: redisClient.isReady,
//       durationMs: Math.round(performance.now() - redisWriteStartedAt),
//       ttlSeconds: savedTtl,
//       tokenPresent: true,
//       ...redisConnectionInfo,
//     });
//   } catch (error) {
//     logHotelEvent("error", "hotel.supplier_token.redis_write_failed", {
//       ...context,
//       supplier: "AKBAR",
//       processId: process.pid,
//       key: AKBAR_TOKEN_KEY,
//       durationMs: Math.round(performance.now() - redisWriteStartedAt),
//       ...redisConnectionInfo,
//       ...getErrorDetails(error),
//     });

//     error.statusCode = error.statusCode ?? 503;
//     throw error;
//   }

//   logHotelEvent("info", "hotel.supplier_request.completed", {
//     ...context,
//     supplier: "AKBAR",
//     operation: "signature",
//     host: signatureUrl.host,
//     path: signatureUrl.pathname,
//     durationMs: Math.round(performance.now() - signatureStartedAt),
//     supplierCode: data.Code,
//     tokenCached: true,
//   });

//   return data.Token;
// };

// export const getAKBARToken = async ({
//   operation = "unspecified",
//   correlationId,
// } = {}) => {
//   const context = {
//     tokenRequestedBy: operation,
//     correlationId,
//     processId: process.pid,
//   };

//   const lookupStartedAt = performance.now();

//   logHotelEvent("info", "hotel.supplier_token.lookup_started", {
//     ...context,
//     supplier: "AKBAR",
//     operation: "token_lookup",
//     key: AKBAR_TOKEN_KEY,
//     redisReady: redisClient.isReady,
//     ...redisConnectionInfo,
//   });

//   const redisToken = await readRedisToken(context);

//   if (redisToken?.ttlSeconds > 0) {
//     logHotelEvent("info", "hotel.supplier_token.resolved", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "token_lookup",
//       source: "redis",
//       tokenPresent: true,
//       ttlSeconds: redisToken.ttlSeconds,
//       durationMs: Math.round(performance.now() - lookupStartedAt),
//     });

//     return redisToken.token;
//   }

//   if (redisToken) {
//     logHotelEvent("warn", "hotel.supplier_token.cache_entry_without_ttl", {
//       ...context,
//       supplier: "AKBAR",
//       key: AKBAR_TOKEN_KEY,
//       ttlSeconds: redisToken.ttlSeconds,
//       ...redisConnectionInfo,
//     });
//   }

//   if (tokenRefreshPromise) {
//     logHotelEvent("info", "hotel.supplier_token.refresh_in_progress", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "token_lookup",
//       source: "shared_refresh_promise",
//     });

//     try {
//       const token = await tokenRefreshPromise;

//       logHotelEvent("info", "hotel.supplier_token.resolved", {
//         ...context,
//         supplier: "AKBAR",
//         operation: "token_lookup",
//         source: "shared_refresh_promise",
//         tokenPresent: Boolean(token),
//         durationMs: Math.round(performance.now() - lookupStartedAt),
//       });

//       return token;
//     } catch (error) {
//       logHotelEvent("error", "hotel.supplier_token.shared_refresh_failed", {
//         ...context,
//         supplier: "AKBAR",
//         operation: "token_lookup",
//         durationMs: Math.round(performance.now() - lookupStartedAt),
//         ...getErrorDetails(error),
//       });

//       throw error;
//     }
//   }

//   logHotelEvent("warn", "hotel.supplier_token.signature_fallback_started", {
//     ...context,
//     supplier: "AKBAR",
//     operation: "token_lookup",
//     reason: redisToken ? "token_without_positive_ttl" : "cache_miss",
//   });

//   tokenRefreshPromise = createAndCacheToken(context);

//   try {
//     const token = await tokenRefreshPromise;

//     logHotelEvent("info", "hotel.supplier_token.resolved", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "token_lookup",
//       source: "signature",
//       tokenPresent: true,
//       durationMs: Math.round(performance.now() - lookupStartedAt),
//     });

//     return token;
//   } catch (error) {
//     logHotelEvent("error", "hotel.supplier_token.signature_fallback_failed", {
//       ...context,
//       supplier: "AKBAR",
//       operation: "token_lookup",
//       durationMs: Math.round(performance.now() - lookupStartedAt),
//       ...getErrorDetails(error),
//     });

//     throw error;
//   } finally {
//     tokenRefreshPromise = undefined;
//   }
// };

// export const refreshAKBARTokenIfDue = async () => {
//   const context = {
//     tokenRequestedBy: "scheduled_refresh",
//     processId: process.pid,
//   };

//   logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_check_started", {
//     ...context,
//     supplier: "AKBAR",
//     key: AKBAR_TOKEN_KEY,
//     redisReady: redisClient.isReady,
//     ...redisConnectionInfo,
//   });

//   const redisToken = await readRedisToken(context);
//   const refreshWindowMs = 60 * 60 * 1000;
//   const remainingMs = (redisToken?.ttlSeconds ?? 0) * 1000;

//   if (remainingMs > refreshWindowMs) {
//     logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_skipped", {
//       ...context,
//       supplier: "AKBAR",
//       reason: "token_ttl_above_refresh_window",
//       remainingSeconds: Math.floor(remainingMs / 1000),
//     });

//     return null;
//   }

//   if (tokenRefreshPromise) {
//     logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_joined", {
//       ...context,
//       supplier: "AKBAR",
//       reason: "refresh_already_in_progress",
//     });

//     return tokenRefreshPromise;
//   }

//   logHotelEvent(
//     redisToken ? "info" : "warn",
//     "hotel.supplier_token.scheduled_refresh_started",
//     {
//       ...context,
//       supplier: "AKBAR",
//       reason: redisToken ? "token_near_expiry" : "token_missing",
//       redisEntryPresent: Boolean(redisToken),
//       ...redisConnectionInfo,
//       remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
//     }
//   );

//   tokenRefreshPromise = createAndCacheToken(context);

//   try {
//     return await tokenRefreshPromise;
//   } catch (error) {
//     logHotelEvent("error", "hotel.supplier_token.scheduled_refresh_failed", {
//       ...context,
//       supplier: "AKBAR",
//       ...getErrorDetails(error),
//     });

//     throw error;
//   } finally {
//     tokenRefreshPromise = undefined;
//   }
// };

import "dotenv/config";
import os from "node:os";
import dns from "node:dns/promises";
import axios from "axios";
import AkbarToken from "./akbarToken.model.js";

import { logHotelEvent } from "../../hotel/utils/hotelObservability.js";

const AKBAR_TOKEN_DOCUMENT_ID = "hotel";
const AKBAR_TOKEN_TTL = 10 * 24 * 60 * 60;
const AKBAR_TOKEN_REFRESH_WINDOW_SECONDS = 60 * 60;
const AKBAR_SIGNATURE_TIMEOUT_MS = 30000;

let tokenRefreshPromise;

const getErrorDetails = (error) => {
  const socket = error?.request?.socket;

  return {
    errorName: error?.name ?? null,
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
    httpStatus: error?.response?.status ?? null,
    syscall: error?.syscall ?? null,
    destinationIp: error?.address ?? socket?.remoteAddress ?? null,
    destinationPort: error?.port ?? socket?.remotePort ?? null,
    localSocketIp: socket?.localAddress ?? null,
    localSocketPort: socket?.localPort ?? null,
    socketBytesWritten: socket?.bytesWritten ?? null,
    socketReused: error?.request?.reusedSocket ?? null,
    responseReceived: Boolean(error?.response),
  };
};

/**
 * Local interface addresses are not necessarily the public IP
 * seen by the supplier. Configure SUPPLIER_EGRESS_PUBLIC_IP
 * separately after verifying the EC2 outbound IP.
 */
const getServerNetworkContext = () => {
  const interfaces = os.networkInterfaces();
  const localAddresses = [];

  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.internal) continue;

      localAddresses.push({
        interface: interfaceName,
        family: address.family,
        address: address.address,
      });
    }
  }

  return {
    hostname: os.hostname(),
    processId: process.pid,
    nodeVersion: process.version,
    localAddresses,
    configuredPublicEgressIp:
      process.env.SUPPLIER_EGRESS_PUBLIC_IP || null,
  };
};

/**
 * Logs the destination host and resolved IP addresses.
 * DNS lookup failure is diagnostic only; it must not block
 * the actual supplier request.
 */
const getDestinationNetworkContext = async (hostname) => {
  try {
    const addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });

    return {
      dnsLookupSucceeded: true,
      destinationAddresses: addresses.map(({ address, family }) => ({
        address,
        family,
      })),
    };
  } catch (error) {
    return {
      dnsLookupSucceeded: false,
      dnsErrorCode: error?.code ?? null,
      dnsErrorMessage: error?.message ?? null,
      destinationAddresses: [],
    };
  }
};

const getSafeUrlContext = (url) => ({
  protocol: url.protocol,
  host: url.host,
  hostname: url.hostname,
  path: url.pathname,
  hasQuery: Boolean(url.search),
  // Never log query-string values, credentials, or tokens.
});

const readMongoToken = async (context = {}) => {
  const startedAt = performance.now();

  logHotelEvent("info", "hotel.supplier_token.database_read_started", {
    ...context,
    supplier: "AKBAR",
    storage: "mongodb",
    documentId: AKBAR_TOKEN_DOCUMENT_ID,
    processId: process.pid,
  });

  try {
    const record = await AkbarToken.findById(AKBAR_TOKEN_DOCUMENT_ID);
    if (
      !record ||
      typeof record.token !== "string" ||
      !record.token.trim() ||
      record.expiresAt <= new Date()
    ) {
      logHotelEvent("warn", "hotel.supplier_token.database_miss", {
        ...context,
        supplier: "AKBAR",
        storage: "mongodb",
        documentId: AKBAR_TOKEN_DOCUMENT_ID,
        recordFound: Boolean(record),
        legacyEncryptedRecord: Boolean(
          record?.encryptedToken && !record?.token
        ),
        durationMs: Math.round(performance.now() - startedAt),
      });
      return null;
    }

    const ttlSeconds = Math.max(
      0,
      Math.floor((record.expiresAt.getTime() - Date.now()) / 1000)
    );
    logHotelEvent("info", "hotel.supplier_token.database_hit", {
      ...context,
      supplier: "AKBAR",
      operation: context.operation ?? context.tokenRequestedBy ?? null,
      storage: "mongodb",
      documentId: AKBAR_TOKEN_DOCUMENT_ID,
      durationMs: Math.round(performance.now() - startedAt),
      ttlSeconds,
      tokenPresent: true,
    });

    return { token: record.token, ttlSeconds };
  } catch (error) {
    if (error.statusCode) throw error;
    logHotelEvent("error", "hotel.supplier_token.database_read_failed", {
      ...context,
      supplier: "AKBAR",
      operation: context.operation ?? context.tokenRequestedBy ?? null,
      processId: process.pid,
      storage: "mongodb",
      documentId: AKBAR_TOKEN_DOCUMENT_ID,
      durationMs: Math.round(performance.now() - startedAt),
      ...getErrorDetails(error),
    });

    error.statusCode = error.statusCode ?? 503;
    throw error;
  }
};

const saveMongoToken = async (token, context = {}) => {
  const startedAt = performance.now();
  const expiresAt = new Date(Date.now() + AKBAR_TOKEN_TTL * 1000);

  logHotelEvent("info", "hotel.supplier_token.database_write_started", {
    ...context,
    supplier: "AKBAR",
    storage: "mongodb",
    documentId: AKBAR_TOKEN_DOCUMENT_ID,
    ttlSeconds: AKBAR_TOKEN_TTL,
  });

  try {
    await AkbarToken.collection.updateOne(
      { _id: AKBAR_TOKEN_DOCUMENT_ID },
      {
        $set: { token, expiresAt },
        $unset: {
          encryptedToken: "",
          iv: "",
          authTag: "",
        },
      },
      { upsert: true }
    );
    logHotelEvent("info", "hotel.supplier_token.database_write_completed", {
      ...context,
      supplier: "AKBAR",
      storage: "mongodb",
      documentId: AKBAR_TOKEN_DOCUMENT_ID,
      tokenStoredPlaintext: true,
      durationMs: Math.round(performance.now() - startedAt),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.database_write_failed", {
      ...context,
      supplier: "AKBAR",
      storage: "mongodb",
      documentId: AKBAR_TOKEN_DOCUMENT_ID,
      durationMs: Math.round(performance.now() - startedAt),
      ...getErrorDetails(error),
    });
    error.statusCode = error.statusCode ?? 503;
    throw error;
  }
};

const createAndCacheToken = async (context = {}) => {
  const signatureStartedAt = performance.now();
  const configuredUrl = process.env.AKBAR_SIGNATURE_URL;

  let signatureUrl;

  try {
    if (!configuredUrl?.trim()) {
      throw new Error("AKBAR_SIGNATURE_URL is not configured");
    }

    signatureUrl = new URL(configuredUrl.trim());

    if (
      signatureUrl.protocol !== "https:" ||
      !signatureUrl.hostname
    ) {
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
      ...getErrorDetails(error),
    });

    error.statusCode = 503;
    throw error;
  }

  const urlContext = getSafeUrlContext(signatureUrl);
  const serverNetwork = getServerNetworkContext();
  const destinationNetwork = await getDestinationNetworkContext(
    signatureUrl.hostname
  );

  logHotelEvent("info", "hotel.signature.request_started", {
    ...context,
    supplier: "AKBAR",
    operation: "signature",
    method: "POST",
    ...urlContext,
    timeoutMs: AKBAR_SIGNATURE_TIMEOUT_MS,
    serverNetwork,
    ...destinationNetwork,
    credentialsLogged: false,
    requestBodyLogged: false,
  });

  let data;

  try {
    const response = await axios.post(
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
        timeout: AKBAR_SIGNATURE_TIMEOUT_MS,
      }
    );

    data = response.data;

    logHotelEvent("info", "hotel.signature.response_received", {
      ...context,
      supplier: "AKBAR",
      operation: "signature",
      ...urlContext,
      httpStatus: response.status,
      durationMs: Math.round(performance.now() - signatureStartedAt),
      responseBodyPresent: data !== null && data !== undefined,
      responseBodyType: Array.isArray(data) ? "array" : typeof data,
      supplierCode: data?.Code ?? null,
      tokenPresent:
        typeof data?.Token === "string" && Boolean(data.Token.trim()),
      serverNetwork,
      ...destinationNetwork,
    });
  } catch (error) {
    logHotelEvent("error", "hotel.signature.request_failed", {
      ...context,
      supplier: "AKBAR",
      operation: "signature",
      method: "POST",
      ...urlContext,
      durationMs: Math.round(performance.now() - signatureStartedAt),
      timeoutMs: AKBAR_SIGNATURE_TIMEOUT_MS,
      serverNetwork: getServerNetworkContext(),
      ...destinationNetwork,
      ...getErrorDetails(error),
    });

    logHotelEvent("error", "hotel.supplier_request.failed", {
      ...context,
      supplier: "AKBAR",
      operation: "signature",
      ...urlContext,
      durationMs: Math.round(performance.now() - signatureStartedAt),
      ...getErrorDetails(error),
    });

    // Keep the original error code/message for the caller.
    error.supplierRequestSent = Boolean(error.request);
    throw error;
  }

  if (
    String(data?.Code) !== "200" ||
    typeof data?.Token !== "string" ||
    !data.Token.trim()
  ) {
    logHotelEvent("error", "hotel.signature.response_rejected", {
      ...context,
      supplier: "AKBAR",
      operation: "signature",
      ...urlContext,
      durationMs: Math.round(performance.now() - signatureStartedAt),
      supplierCode: data?.Code ?? null,
      supplierMessage:
        typeof data?.Msg === "string" ? data.Msg.slice(0, 200) : null,
      tokenPresent: Boolean(data?.Token),
    });

    const error = new Error("Failed to generate AKBAR token");
    error.statusCode = 502;
    error.supplierRequestSent = true;
    throw error;
  }

  await saveMongoToken(data.Token, context);

  logHotelEvent("info", "hotel.supplier_request.completed", {
    ...context,
    supplier: "AKBAR",
    operation: "signature",
    ...urlContext,
    durationMs: Math.round(performance.now() - signatureStartedAt),
    supplierCode: data.Code,
    tokenStored: true,
    storage: "mongodb",
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

  const lookupStartedAt = performance.now();

  logHotelEvent("info", "hotel.supplier_token.lookup_started", {
    ...context,
    supplier: "AKBAR",
    operation: "token_lookup",
    storage: "mongodb",
    documentId: AKBAR_TOKEN_DOCUMENT_ID,
  });

  const storedToken = await readMongoToken(context);

  if (storedToken?.ttlSeconds > 0) {
    logHotelEvent("info", "hotel.supplier_token.resolved", {
      ...context,
      supplier: "AKBAR",
      operation: "token_lookup",
      source: "mongodb",
      tokenPresent: true,
      ttlSeconds: storedToken.ttlSeconds,
      durationMs: Math.round(performance.now() - lookupStartedAt),
    });

    return storedToken.token;
  }

  if (tokenRefreshPromise) {
    logHotelEvent("info", "hotel.supplier_token.refresh_in_progress", {
      ...context,
      supplier: "AKBAR",
      operation: "token_lookup",
      source: "shared_refresh_promise",
    });

    try {
      const token = await tokenRefreshPromise;

      logHotelEvent("info", "hotel.supplier_token.resolved", {
        ...context,
        supplier: "AKBAR",
        operation: "token_lookup",
        source: "shared_refresh_promise",
        tokenPresent: Boolean(token),
        durationMs: Math.round(performance.now() - lookupStartedAt),
      });

      return token;
    } catch (error) {
      logHotelEvent("error", "hotel.supplier_token.shared_refresh_failed", {
        ...context,
        supplier: "AKBAR",
        operation: "token_lookup",
        durationMs: Math.round(performance.now() - lookupStartedAt),
        ...getErrorDetails(error),
      });

      throw error;
    }
  }

  logHotelEvent("warn", "hotel.supplier_token.signature_refresh_started", {
    ...context,
    supplier: "AKBAR",
    operation: "token_lookup",
    reason: storedToken ? "token_expired" : "document_missing",
  });

  tokenRefreshPromise = createAndCacheToken(context);

  try {
    const token = await tokenRefreshPromise;

    logHotelEvent("info", "hotel.supplier_token.resolved", {
      ...context,
      supplier: "AKBAR",
      operation: "token_lookup",
      source: "signature_mongodb",
      tokenPresent: true,
      durationMs: Math.round(performance.now() - lookupStartedAt),
    });

    return token;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.signature_refresh_failed", {
      ...context,
      supplier: "AKBAR",
      operation: "token_lookup",
      durationMs: Math.round(performance.now() - lookupStartedAt),
      ...getErrorDetails(error),
    });

    throw error;
  } finally {
    tokenRefreshPromise = undefined;
  }
};

export const refreshAKBARTokenIfDue = async () => {
  const context = {
    tokenRequestedBy: "scheduled_refresh",
    processId: process.pid,
  };

  logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_check_started", {
    ...context,
    supplier: "AKBAR",
    storage: "mongodb",
    documentId: AKBAR_TOKEN_DOCUMENT_ID,
  });

  const storedToken = await readMongoToken(context);
  const remainingSeconds = storedToken?.ttlSeconds ?? 0;

  if (remainingSeconds > AKBAR_TOKEN_REFRESH_WINDOW_SECONDS) {
    logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_skipped", {
      ...context,
      supplier: "AKBAR",
      reason: "token_ttl_above_refresh_window",
      remainingSeconds,
    });

    return null;
  }

  if (tokenRefreshPromise) {
    logHotelEvent("info", "hotel.supplier_token.scheduled_refresh_joined", {
      ...context,
      supplier: "AKBAR",
      reason: "refresh_already_in_progress",
    });

    return tokenRefreshPromise;
  }

  logHotelEvent(
    storedToken ? "info" : "warn",
    "hotel.supplier_token.scheduled_refresh_started",
    {
      ...context,
      supplier: "AKBAR",
      reason: storedToken ? "token_near_expiry" : "token_missing",
      databaseRecordPresent: Boolean(storedToken),
      remainingSeconds,
    }
  );

  tokenRefreshPromise = createAndCacheToken(context);

  try {
    return await tokenRefreshPromise;
  } catch (error) {
    logHotelEvent("error", "hotel.supplier_token.scheduled_refresh_failed", {
      ...context,
      supplier: "AKBAR",
      ...getErrorDetails(error),
    });

    throw error;
  } finally {
    tokenRefreshPromise = undefined;
  }
};
