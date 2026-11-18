import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import AkbarBusToken from "../supplier/akbar/akbarBusToken.model.js";
import { getAkbarBusSession } from "../supplier/akbar/akbarBus.auth.js";

test("bus signature logs exchanges without leaking credentials or changing auth", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "bus-signature-logs-"));
  const env = {
    AKBAR_BUS_API_LOG_FILE: path.join(directory, "exchanges.jsonl"),
    AKBAR_BUS_SIGNATURE_URL: "https://supplier.example/Utils/Signature?key=url-secret",
    AKBAR_BUS_API_KEY: "private-api-key",
    AKBAR_BUS_CLIENT_ID: "private-client-id",
    AKBAR_BUS_PASSWORD: "private-password",
    AKBAR_BUS_BROWSER_KEY: "private-browser-key",
    AKBAR_BUS_KEY: "private-key",
    AKBAR_BUS_MERCHANT_ID: "private-merchant-id",
  };
  const previous = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  const original = {
    adapter: axios.defaults.adapter,
    findById: AkbarBusToken.findById,
    update: AkbarBusToken.findByIdAndUpdate,
    info: console.info,
    log: console.log,
    error: console.error,
  };
  const consoleLines = [];
  Object.assign(process.env, env);
  console.info = line => consoleLines.push(line);
  console.log = () => {};
  console.error = line => consoleLines.push(line);
  AkbarBusToken.findByIdAndUpdate = async () => ({});
  t.after(async () => {
    axios.defaults.adapter = original.adapter;
    AkbarBusToken.findById = original.findById;
    AkbarBusToken.findByIdAndUpdate = original.update;
    console.info = original.info;
    console.log = original.log;
    console.error = original.error;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith("bus-signature-logs-"));
    await rm(directory, { recursive: true, force: true });
  });

  const successBody = { Code: "200", Token: "private-returned-token", ClientID: "private-returned-client" };
  const events = async () => (await readFile(env.AKBAR_BUS_API_LOG_FILE, "utf8"))
    .trim().split("\n").map(JSON.parse);

  await t.test("fresh signature preserves HTTP payload and logs a matched response", async () => {
    axios.defaults.adapter = async config => {
      assert.equal(config.timeout, 20000);
      assert.equal(JSON.parse(config.data).Password, env.AKBAR_BUS_PASSWORD);
      return { status: 200, data: successBody, headers: { "content-type": "application/json" }, config };
    };
    const session = await getAkbarBusSession({ forceRefresh: true });
    assert.equal(session.token, successBody.Token);
    assert.equal(session.source, "signature");
    const [request, response] = await events();
    assert.equal(request.event, "request");
    assert.equal(response.event, "response");
    assert.equal(request.exchangeId, response.exchangeId);
    assert.equal(request.endpoint, "https://supplier.example/Utils/Signature");
    assert.equal(response.status, 200);
    assert.equal(response.response.Token.redacted, true);
    assert.equal(request.request.body.Password.redacted, true);
    assert(response.durationMs >= 0);
  });

  await t.test("cached session logs its source without making a supplier request", async () => {
    AkbarBusToken.findById = () => ({ lean: async () => ({
      token: successBody.Token, clientId: successBody.ClientID,
      expiresAt: new Date(Date.now() + 3600000), updatedAt: new Date(),
    }) });
    axios.defaults.adapter = async () => { throw new Error("Unexpected HTTP call"); };
    const session = await getAkbarBusSession();
    assert.equal(session.source, "db");
    assert.equal((await events()).at(-1).event, "cache_hit");
  });

  await t.test("HTTP failure logs redacted response and keeps the existing 502 error", async () => {
    axios.defaults.adapter = async () => {
      throw Object.assign(new Error("supplier failed"), {
        response: { status: 403, headers: { "set-cookie": "private-cookie" }, data: { Code: "403", Token: "private-error-token" } },
      });
    };
    await assert.rejects(getAkbarBusSession({ forceRefresh: true }), { statusCode: 502 });
    const entries = await events();
    const failure = entries.at(-1);
    assert.equal(failure.event, "error");
    assert.equal(failure.status, 403);
    assert.equal(failure.exchangeId, entries.at(-2).exchangeId);
    assert.equal(failure.headers["set-cookie"].redacted, true);
  });

  await t.test("timeout remains 504 and is identified in the log", async () => {
    axios.defaults.adapter = async () => { throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" }); };
    await assert.rejects(getAkbarBusSession({ forceRefresh: true }), { statusCode: 504 });
    assert.equal((await events()).at(-1).timedOut, true);
  });

  await t.test("HTTP 200 with an invalid supplier body logs validation failure", async () => {
    axios.defaults.adapter = async config => ({ status: 200, data: { Code: "500", Msg: ["Rejected"] }, headers: {}, config });
    await assert.rejects(getAkbarBusSession({ forceRefresh: true }), { statusCode: 502 });
    const failure = (await events()).at(-1);
    assert.equal(failure.event, "validation_failed");
    assert.equal(failure.hasToken, false);
    assert.equal(failure.hasClientId, false);
  });

  await t.test("file logging failure does not prevent a usable session", async () => {
    process.env.AKBAR_BUS_API_LOG_FILE = directory;
    axios.defaults.adapter = async config => ({ status: 200, data: successBody, headers: {}, config });
    const session = await getAkbarBusSession({ forceRefresh: true });
    assert.equal(session.token, successBody.Token);
  });

  const captured = (await readFile(env.AKBAR_BUS_API_LOG_FILE, "utf8")) + consoleLines.join("\n");
  for (const secret of [
    ...Object.values(env).filter(value => value.startsWith("private-")),
    successBody.Token, successBody.ClientID, "url-secret", "private-cookie", "private-error-token",
  ]) assert(!captured.includes(secret), "Credential leaked into logs");
});
