import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  logSupplierApiExchange,
  logSupplierCredentialContext,
} from "./hotelObservability.js";
import { mapAkbarAuxiliaries } from "../itinerary/adapters/akbar/akbarAuxiliaries.mapper.js";

test("verification exchanges preserve actual values on success, failure and credential context", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hotel-verification-"));
  const previousPath = process.env.AKBAR_API_LOG_FILE;
  const originalInfo = console.info;
  const consoleLines = [];
  process.env.AKBAR_API_LOG_FILE = path.join(directory, "exchanges.jsonl");
  console.info = (line) => consoleLines.push(JSON.parse(line));
  try {
    const headers = { Authorization: "Bearer test-token", "search-tracing-key": "test-trace" };
    const request = { body: { agentCode: "14005", companyId: "1", searchTracingKey: "test-trace", Password: "test-password", Pan: "", GSTCompanyName: "Test Company", GSTTIN: "test-gst" } };
    const response = { status: 200, headers: { toJSON: () => ({ "set-cookie": "test-cookie" }) }, data: { Token: "test-response-token", searchTracingKey: "test-trace" } };
    const result = await logSupplierApiExchange({ operation: "hotel_search_init", method: "POST", endpoint: "https://supplier.example/init", headers, request }, async () => response);
    assert.equal(result, response);
    const error = new Error("supplier rejected request");
    error.response = { status: 400, headers: { "search-tracing-key": "error-trace" }, data: { searchTracingKey: "error-trace", Token: "error-token" } };
    await assert.rejects(logSupplierApiExchange({ operation: "create_itinerary", method: "POST", endpoint: "https://supplier.example/itinerary", headers, request }, async () => { throw error; }), (caught) => caught === error);
    const credentials = { ClientID: "test-client", Token: "test-token" };
    await logSupplierCredentialContext({ operation: "retrieve_booking", credentials });
    const records = (await readFile(process.env.AKBAR_API_LOG_FILE, "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(records.length, 5);
    assert.deepEqual(records[0].request, request);
    assert.deepEqual(records[0].headers, headers);
    assert.deepEqual(records[1].response, response.data);
    assert.equal(records[1].headers["set-cookie"], "test-cookie");
    assert.equal(records[3].event, "error");
    assert.deepEqual(records[3].response, error.response.data);
    assert.deepEqual(records[4].credentials, credentials);
    assert.deepEqual(consoleLines, records);
  } finally {
    console.info = originalInfo;
    if (previousPath === undefined) delete process.env.AKBAR_API_LOG_FILE;
    else process.env.AKBAR_API_LOG_FILE = previousPath;
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith("hotel-verification-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("customer details match the supplier sample and retain the searched countries", () => {
  const auxiliaries = mapAkbarAuxiliaries({ nationality: "US", countryOfResidence: "AE" });
  assert.equal(auxiliaries[0].Code, "PROMO");
  assert.equal(auxiliaries[0].Parameters.length, 3);
  assert.deepEqual(auxiliaries[1], {
    Code: "CUSTOMER DETAILS",
    parameters: [
      { Type: "Nationality", Value: "US" },
      { Type: "Country of Residence", Value: "AE" },
    ],
  });
  assert.deepEqual(mapAkbarAuxiliaries({})[1].parameters.map((parameter) => parameter.Value), ["IN", "IN"]);
});
