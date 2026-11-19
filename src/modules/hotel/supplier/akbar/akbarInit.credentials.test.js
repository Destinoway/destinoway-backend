import test from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns/promises";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import axios from "axios";
import AkbarToken from "./akbarToken.model.js";
import { getAKBARToken, getAKBARSignatureClientID } from "./akbarAuth.service.js";
import { akbarInitAPI } from "../../hotel/hotelSearch/adapters/akbar/hotelSearch/api/akbarInit.api.js";

test("Init sends the complete Signature TUI with its matching token", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "akbar-init-test-"));
  const overrides = {
    AKBAR_SIGNATURE_URL: "https://supplier.example/Utils/Signature",
    AKBAR_HOTEL_API_URL: "https://supplier.example",
    AKBAR_API_LOG_FILE: path.join(directory, "exchanges.jsonl"),
    AKBAR_AGENT_PROFILE_URL: "https://supplier.example/utils/AgentProfile",
  };
  const previousEnv = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
  const original = { findById: AkbarToken.findById, updateOne: AkbarToken.collection.updateOne, adapter: axios.defaults.adapter, lookup: dns.lookup, info: console.info };
  let record;
  let signatureCalls;
  let initCalls;
  let profileCalls;
  let profileData;
  let profileFailure;
  let beforeProfileResponse;
  const signatureTui = "signature-uuid|session-uuid|20261119130000";
  let signatureData;
  Object.assign(process.env, overrides);
  console.info = () => {};
  dns.lookup = async () => [];
  AkbarToken.findById = async () => record;
  AkbarToken.collection.updateOne = async (filter, update) => {
    if (filter.token && (record?.token !== filter.token || record?.signatureTui !== filter.signatureTui)) {
      return { acknowledged: true, matchedCount: 0 };
    }
    record = { ...record, ...update.$set };
    for (const key of Object.keys(update.$unset ?? {})) delete record[key];
    return { acknowledged: true, matchedCount: 1 };
  };
  axios.defaults.adapter = async (config) => {
    if (config.url.endsWith("/Utils/Signature")) {
      signatureCalls++;
      return { status: 200, headers: {}, data: signatureData, config };
    }
    if (config.url.endsWith("/utils/AgentProfile")) {
      profileCalls++;
      assert.deepEqual(JSON.parse(config.data), { TUI: signatureTui, Mode: ["A"] });
      assert.equal(config.headers.Authorization, `Bearer ${record.token}`);
      assert.equal(config.timeout, 30000);
      if (profileFailure) throw profileFailure;
      if (beforeProfileResponse) beforeProfileResponse();
      return { status: 200, headers: {}, data: profileData, config };
    }
    assert(config.url.endsWith("/api/hotels/search/init"));
    initCalls++;
    const body = JSON.parse(config.data);
    assert.equal(body.searchTracingKey, signatureTui);
    assert.equal(config.headers.Authorization, "Bearer " + (beforeProfileResponse ? "original-token" : record.token));
    assert.equal(body.agentCode, "account-agent");
    assert.equal(body.segmentId, "account-deal");
    assert.equal(body.companyId, "42");
    return { status: 200, headers: {}, data: { searchId: "test-search", searchTracingKey: "init-response-trace" }, config };
  };
  t.after(async () => {
    AkbarToken.findById = original.findById;
    AkbarToken.collection.updateOne = original.updateOne;
    axios.defaults.adapter = original.adapter;
    dns.lookup = original.lookup;
    console.info = original.info;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith("akbar-init-test-"));
    await rm(directory, { recursive: true, force: true });
  });
  const reset = () => {
    record = null;
    signatureCalls = 0;
    initCalls = 0;
    profileCalls = 0;
    profileFailure = null;
    beforeProfileResponse = null;
    profileData = { Code: "200", code: "account-agent", htdealCode: "account-deal", id: 42 };
    signatureData = { Code: "200", Token: "fresh-token", ClientID: "client-id", TUI: signatureTui };
  };

  await t.test("fresh Signature persists TUI and logs the actual Init request", async () => {
    reset();
    const payload = { locationId: "227736", searchTracingKey: "caller-value", agentCode: "caller-agent", segmentId: "caller-deal", companyId: "caller-company" };
    const result = await akbarInitAPI(payload, { correlationId: "fresh-search" });
    assert.equal(result.searchTracingKey, "init-response-trace");
    assert.equal(payload.searchTracingKey, "caller-value");
    assert.equal(record.signatureTui, signatureTui);
    assert.equal(signatureCalls, 1);
    assert.equal(initCalls, 1);
    assert.equal(profileCalls, 1);
    assert.equal(record.agentProfile.companyId, "42");
    const logs = (await readFile(overrides.AKBAR_API_LOG_FILE, "utf8")).trim().split("\n").map(JSON.parse);
    const initLog = logs.find((row) => row.operation === "hotel_search_init" && row.event === "request");
    assert.equal(initLog.request.body.searchTracingKey, signatureTui);
    assert.equal(initLog.request.body.agentCode, "account-agent");
    const profileLog = logs.find((row) => row.operation === "agent_profile" && row.event === "request");
    assert.equal(profileLog.correlationId, "fresh-search");
  });

  await t.test("valid cache reuses the matching token and TUI without Signature", async () => {
    reset();
    record = { token: "cached-token", signatureTui, expiresAt: new Date(Date.now() + 3600000) };
    await akbarInitAPI({});
    assert.equal(signatureCalls, 0);
    assert.equal(initCalls, 1);
    assert.equal(profileCalls, 1);
    await akbarInitAPI({});
    assert.equal(signatureCalls, 0);
    assert.equal(profileCalls, 1);
    assert.equal(initCalls, 2);
  });

  await t.test("legacy cache missing TUI refreshes once for concurrent Init calls", async () => {
    reset();
    record = { token: "legacy-token", expiresAt: new Date(Date.now() + 3600000) };
    await Promise.all([akbarInitAPI({}), akbarInitAPI({})]);
    assert.equal(signatureCalls, 1);
    assert.equal(initCalls, 2);
    assert.equal(record.token, "fresh-token");
    assert.equal(profileCalls, 1);
  });

  await t.test("expired cache refreshes token and TUI together", async () => {
    reset();
    record = { token: "expired-token", signatureTui: "old-tui", expiresAt: new Date(Date.now() - 1000), agentProfile: { agentCode: "old-agent", segmentId: "old-deal", companyId: "old-company" } };
    await akbarInitAPI({});
    assert.equal(signatureCalls, 1);
    assert.equal(record.signatureTui, signatureTui);
    assert.equal(profileCalls, 1);
    assert.equal(record.agentProfile.agentCode, "account-agent");
  });

  await t.test("missing Signature TUI blocks Init with a clear error", async () => {
    reset();
    delete signatureData.TUI;
    await assert.rejects(akbarInitAPI({}), (error) => error.statusCode === 502 && /TUI required for Init/.test(error.message));
    assert.equal(signatureCalls, 1);
    assert.equal(initCalls, 0);
    assert.equal(profileCalls, 0);
  });

  await t.test("complete profile cache needs neither Signature nor AgentProfile", async () => {
    reset();
    record = { token: "cached-token", signatureTui, expiresAt: new Date(Date.now() + 3600000), agentProfile: { agentCode: "account-agent", segmentId: "account-deal", companyId: "42" } };
    await akbarInitAPI({});
    assert.equal(signatureCalls, 0);
    assert.equal(profileCalls, 0);
  });

  await t.test("missing profile fields and supplier failure block Init without poisoning cache", async () => {
    for (const field of ["code", "htdealCode", "id", "Code"]) {
      reset();
      delete profileData[field];
      await assert.rejects(akbarInitAPI({}), (error) => error.statusCode === 502);
      assert.equal(initCalls, 0);
      assert.equal(record.agentProfile, undefined);
      profileData = { Code: "200", code: "account-agent", htdealCode: "account-deal", id: "42" };
      await akbarInitAPI({});
      assert.equal(signatureCalls, 1);
      assert.equal(profileCalls, 2);
      assert.equal(initCalls, 1);
    }
  });

  await t.test("profile network failure leaves token usable and permits retry", async () => {
    reset();
    profileFailure = new Error("profile timed out");
    await assert.rejects(akbarInitAPI({}), /profile timed out/);
    assert.equal(initCalls, 0);
    assert.equal(await getAKBARToken(), "fresh-token");
    assert.equal(await getAKBARSignatureClientID(), "client-id");
    assert.equal(profileCalls, 1);
    profileFailure = null;
    await akbarInitAPI({});
    assert.equal(signatureCalls, 1);
    assert.equal(initCalls, 1);
  });

  await t.test("utility endpoint defaults to Signature service origin", async () => {
    reset();
    delete process.env.AKBAR_AGENT_PROFILE_URL;
    await akbarInitAPI({});
    assert.equal(profileCalls, 1);
    process.env.AKBAR_AGENT_PROFILE_URL = overrides.AKBAR_AGENT_PROFILE_URL;
  });

  await t.test("profile is never written into a newly refreshed token session", async () => {
    reset();
    record = { token: "original-token", signatureTui, expiresAt: new Date(Date.now() + 3600000) };
    beforeProfileResponse = () => {
      record = { token: "newer-token", signatureTui: "newer-tui", expiresAt: new Date(Date.now() + 3600000) };
    };
    await akbarInitAPI({});
    assert.equal(record.token, "newer-token");
    assert.equal(record.agentProfile, undefined);
  });
});
