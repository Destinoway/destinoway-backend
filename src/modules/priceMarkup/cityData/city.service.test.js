import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import Country from "../countryData/country.model.js";
import State from "../stateData/state.model.js";
import CityCache from "./city.model.js";
import { getCities } from "./city.service.js";
import { cityMemory } from "./city.memory.js";

test("city memory expires entries and evicts least recently used entries", (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  cityMemory.clear();
  t.after(() => cityMemory.clear());
  for (let i = 0; i < 500; i++) cityMemory.set(String(i), { cities: [] });
  assert.deepEqual(cityMemory.get("0"), { cities: [] });
  cityMemory.set("500", { cities: ["Jaipur"] });
  assert.equal(cityMemory.get("1"), null);
  assert.deepEqual(cityMemory.get("0"), { cities: [] });
  now += 60 * 60 * 1000;
  assert.equal(cityMemory.get("500"), null);
});

test("cities persist complete lists and reuse country/state cache", async (t) => {
  const cache = new Map();
  const reset = () => { cache.clear(); cityMemory.clear(); };
  t.after(() => cityMemory.clear());
  let calls = 0;
  let provider = { error: false, data: [" Jaipur ", "Ajmer", "Jaipur"] };
  let fallback = new Error("GET unavailable");
  let fallbackCalls = 0;
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  const query = (value) => ({ lean: async () => value });
  t.mock.method(Country, "findOne", (filter) => query(
    filter.$or.some((entry) => Object.values(entry)[0].test("India") || Object.values(entry)[0].test("IN"))
      ? { countryName: "India", countryCode: "IN" } : null));
  t.mock.method(State, "findOne", (filter) => query(
    filter.stateName.test("Rajasthan") ? { stateName: "Rajasthan" } : null));
  t.mock.method(CityCache, "findOne", (key) => query(cache.get(JSON.stringify(key))));
  t.mock.method(CityCache, "findOneAndUpdate", (key, update, options) => {
    assert.equal(options.upsert, true);
    cache.set(JSON.stringify(key), update.$setOnInsert);
    return query(update.$setOnInsert);
  });
  t.mock.method(axios, "post", async (url, body, options) => {
    calls++;
    assert.equal(url, "https://countriesnow.space/api/v0.1/countries/state/cities");
    assert.deepEqual(body, { country: "India", state: "Rajasthan" });
    assert.equal(options.timeout, 20000);
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (provider instanceof Error) throw provider;
    return { data: provider };
  });
  t.mock.method(axios, "get", async (url, options) => {
    fallbackCalls++;
    assert.equal(url, "https://countriesnow.space/api/v0.1/countries/state/cities/q");
    assert.deepEqual(options.params, { country: "India", state: "Rajasthan" });
    if (fallback instanceof Error) throw fallback;
    return { data: fallback };
  });

  const input = { countryCode: " in ", state: " rajasthan " };
  const first = await getCities({ ...input, search: "jai" });
  assert.deepEqual(first.cities, ["Jaipur"]);
  assert.deepEqual((await getCities({ country: "India", state: "Rajasthan" })).cities, ["Ajmer", "Jaipur"]);
  assert.equal(calls, 1, "filtering must not save a partial list or re-fetch");

  const dbMocks = [Country.findOne, State.findOne, CityCache.findOne];
  const counts = () => dbMocks.map((mock) => mock.mock.callCount());
  const warmCounts = counts();
  const warmResult = await getCities(input);
  warmResult.cities.push("caller mutation");
  assert.deepEqual((await getCities({ country: "INDIA", state: "RAJASTHAN", search: "jai" })).cities, ["Jaipur"]);
  assert.deepEqual((await getCities(input)).cities, ["Ajmer", "Jaipur"]);
  assert.deepEqual(counts(), warmCounts, "warm requests use zero DB queries, including name aliases and filters");

  cityMemory.clear();
  const coldCounts = counts();
  assert.deepEqual((await getCities(input)).cities, ["Ajmer", "Jaipur"]);
  assert.deepEqual(counts(), [coldCounts[0], coldCounts[1], coldCounts[2] + 1], "saved code requests use one indexed lookup after restart");
  assert.equal(calls, 1);

  reset();
  const before = calls;
  await Promise.all([getCities(input), getCities(input), getCities(input)]);
  assert.equal(calls, before + 1, "concurrent misses share a provider call");

  reset();
  provider = { error: false, data: [] };
  assert.deepEqual((await getCities(input)).cities, []);
  const emptyCalls = calls;
  await getCities(input);
  assert.equal(calls, emptyCalls, "valid empty lists are cached");

  for (const bad of [new Error("timeout"), { error: true, data: [] }, { error: false, data: [null] }]) {
    reset();
    provider = bad;
    await assert.rejects(getCities(input), { statusCode: 502 });
    assert.equal(cache.size, 0, "failed responses must not poison the cache");
    provider = { error: false, data: ["Jaipur"] };
    assert.deepEqual((await getCities(input)).cities, ["Jaipur"], "failed calls can retry");
  }

  const validCalls = calls;
  for (const invalid of [{}, { country: ["India"], state: "Rajasthan" }, { ...input, search: {} }]) {
    await assert.rejects(getCities(invalid), { statusCode: 400 });
  }
  await assert.rejects(getCities({ country: "Unknown", state: "Rajasthan" }), { statusCode: 404 });
  await assert.rejects(getCities({ country: "India", state: ".*" }), { statusCode: 404 });
  assert.equal(calls, validCalls, "invalid inputs never call the provider");

  reset();
  provider = Object.assign(new Error("POST blocked"), { response: { status: 405 } });
  fallback = { error: false, data: ["Jaipur"] };
  assert.deepEqual((await getCities(input)).cities, ["Jaipur"]);
  const recoveredCalls = calls;
  await getCities(input);
  assert.equal(calls, recoveredCalls, "GET fallback results are persisted");

  reset();
  provider = Object.assign(new Error("rate limited"), { response: { status: 429 } });
  const beforeLimited = fallbackCalls;
  await assert.rejects(getCities(input), (error) => error.details.status === 429);
  assert.equal(fallbackCalls, beforeLimited, "rate limits must not trigger another request");

  provider = Object.assign(new Error("DNS lookup failed"), { code: "ENOTFOUND" });
  fallback = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
  await assert.rejects(getCities(input), (error) =>
    error.statusCode === 502 && error.details.post.code === "ENOTFOUND" && error.details.get.code === "ETIMEDOUT");
  assert.equal(cache.size, 0);
});
