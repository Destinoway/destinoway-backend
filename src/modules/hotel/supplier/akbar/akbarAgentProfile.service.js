import axios from "axios";
import AkbarToken from "./akbarToken.model.js";
import { getAKBARSearchCredentials } from "./akbarAuth.service.js";
import { logSupplierApiExchange } from "../../hotel/utils/hotelObservability.js";

const pendingProfiles = new Map();

const profileError = (message, statusCode = 502) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeValue = (value) =>
  (typeof value === "string" || typeof value === "number")
    ? String(value).trim()
    : "";

const hasProfile = (profile) =>
  profile && [profile.agentCode, profile.segmentId, profile.companyId]
    .every((value) => normalizeValue(value) !== "");

const getProfileEndpoint = () => {
  try {
    // UtilityURL is the same utility service used for Signature. Allow an
    // explicit endpoint when the supplier assigns a separate UtilityURL.
    const endpoint = process.env.AKBAR_AGENT_PROFILE_URL?.trim()
      ? new URL(process.env.AKBAR_AGENT_PROFILE_URL.trim())
      : new URL("/utils/AgentProfile", process.env.AKBAR_SIGNATURE_URL);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new Error("Invalid utility endpoint");
    }
    return endpoint.toString();
  } catch {
    throw profileError("Configure a valid HTTPS AKBAR_AGENT_PROFILE_URL or AKBAR_SIGNATURE_URL", 503);
  }
};

const fetchAndCacheProfile = async (session, correlationId) => {
  const endpoint = getProfileEndpoint();
  const body = { TUI: session.searchTracingKey, Mode: ["A"] };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.token}`,
  };
  const response = await logSupplierApiExchange({
    operation: "agent_profile",
    correlationId,
    method: "POST",
    endpoint,
    headers,
    request: { body },
  }, () => axios.post(endpoint, body, { headers, timeout: 30000 }));

  const data = response.data;
  if (String(data?.Code) !== "200") {
    throw profileError("AKBAR AgentProfile did not return success");
  }
  // Lowercase code is the account's agent code; uppercase Code is API status.
  const agentProfile = {
    agentCode: normalizeValue(data.code),
    segmentId: normalizeValue(data.htdealCode),
    companyId: normalizeValue(data.id),
  };
  if (!hasProfile(agentProfile)) {
    throw profileError("AKBAR AgentProfile is missing code, htdealCode or id required for Init");
  }

  // A scheduled Signature refresh may have replaced the session while this
  // request was running. Never attach an old profile to a newer token.
  await AkbarToken.collection.updateOne({
    _id: "hotel",
    token: session.token,
    signatureTui: session.searchTracingKey,
  }, { $set: { agentProfile } });
  return agentProfile;
};

export const getAKBARInitContext = async ({ correlationId } = {}) => {
  const session = await getAKBARSearchCredentials({ correlationId });
  let agentProfile = session.agentProfile;
  if (!hasProfile(agentProfile)) {
    let pending = pendingProfiles.get(session.token);
    if (!pending) {
      pending = fetchAndCacheProfile(session, correlationId);
      pendingProfiles.set(session.token, pending);
    }
    try {
      agentProfile = await pending;
    } finally {
      if (pendingProfiles.get(session.token) === pending) {
        pendingProfiles.delete(session.token);
      }
    }
  }
  return {
    token: session.token,
    searchTracingKey: session.searchTracingKey,
    agentCode: agentProfile.agentCode,
    segmentId: agentProfile.segmentId,
    companyId: agentProfile.companyId,
  };
};
