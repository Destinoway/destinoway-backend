import axios from "axios";
import { timeSupplierCall } from "../../../../utils/apiTiming.js";
import {
  clearAkbarBusSession,
  getAkbarBusSession,
} from "./akbarBus.auth.js";

// =========================================================
// AKBAR BUS HTTP CLIENT
//
// Every bus API call goes through akbarBusPost():
//   - gets Token + ClientID (cached)
//   - sends Bearer token
//   - on 401/403: gets a fresh token and retries ONCE
//   - converts errors into one clean error format
// =========================================================

const DEFAULT_TIMEOUT_MS = 30000;

const AUTH_ERROR_STATUSES = [401, 403];

const toBusError = (error, path) => {
  const status = error.response?.status;

  const busError = new Error(
    error.code === "ECONNABORTED"
      ? `AKBAR bus API timed out: ${path}`
      : `AKBAR bus API failed: ${path}${status ? ` (HTTP ${status})` : ""}`,
  );

  // 502/504 = problem on supplier side, not the user's request.
  busError.statusCode = error.code === "ECONNABORTED" ? 504 : 502;
  busError.supplierStatus = status || null;
  busError.supplierResponse = error.response?.data || null;

  return busError;
};

/**
 * POST to an AKBAR bus API.
 *
 * @param {string} path  e.g. "/api/bus/getbusstations"
 * @param {(session) => object} buildBody
 *        Gets { token, clientId, ... } and returns the request body.
 *        A function, so the retry can rebuild the body with the new ClientID.
 * @param {{ timeout?: number }} options
 * @returns response data from AKBAR
 */
export const akbarBusPost = async (path, buildBody, options = {}) => {
  // Trim spaces/quotes and trailing "/" so we never build "//api/...".
  const baseUrl = String(process.env.AKBAR_BUS_API_URL || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");

  const url = `${baseUrl}${path}`;
  const timeout = options.timeout || DEFAULT_TIMEOUT_MS;

  const send = async (session) => {
    const body = buildBody(session);
    const response = await timeSupplierCall(
      { supplier: "AKBAR", operation: path, method: "POST" },
      () => axios.post(url, body, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        timeout,
      }),
    );

    return response.data;
  };

  let session = await getAkbarBusSession();

  try {
    return await send(session);
  } catch (error) {
    const status = error.response?.status;

    if (!AUTH_ERROR_STATUSES.includes(status)) {
      throw toBusError(error, path);
    }

    // Token rejected: drop it, get a new one, retry once.
    console.warn(`AKBAR BUS ${path}: HTTP ${status}, refreshing token`);

    await clearAkbarBusSession();
    session = await getAkbarBusSession({ forceRefresh: true });

    try {
      return await send(session);
    } catch (retryError) {
      throw toBusError(retryError, path);
    }
  }
};
