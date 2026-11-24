import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import axios from "axios";
import {
  getAutocompleteService,
  getPlaceDetailsService,
} from "./olaMaps.service.js";

const originalApiKey = process.env.OLA_MAPS_API_KEY;

afterEach(() => {
  mock.restoreAll();
  if (originalApiKey === undefined) {
    delete process.env.OLA_MAPS_API_KEY;
  } else {
    process.env.OLA_MAPS_API_KEY = originalApiKey;
  }
});

test("Ola Maps autocomplete sends input, optional location, and the server API key", async () => {
  process.env.OLA_MAPS_API_KEY = "test-api-key";
  const expectedData = { predictions: [] };
  const axiosGet = mock.method(axios, "get", async (url, config) => {
    assert.equal(url, "https://api.olamaps.io/places/v1/autocomplete");
    assert.deepEqual(config.params, {
      input: "Jaipur airport",
      location: "26.9124,75.7873",
      api_key: "test-api-key",
    });
    assert.ok(config.headers["X-Request-Id"]);
    assert.equal(config.timeout, 10000);
    return { data: expectedData };
  });

  assert.equal(
    await getAutocompleteService({
      input: "Jaipur airport",
      location: "26.9124,75.7873",
    }),
    expectedData,
  );
  assert.equal(axiosGet.mock.callCount(), 1);
});

test("Ola Maps place details uses the selected place ID", async () => {
  process.env.OLA_MAPS_API_KEY = "test-api-key";
  const expectedData = { result: { place_id: "ola-place-id" } };
  mock.method(axios, "get", async (url, config) => {
    assert.equal(url, "https://api.olamaps.io/places/v1/details");
    assert.deepEqual(config.params, {
      place_id: "ola-place-id",
      api_key: "test-api-key",
    });
    return { data: expectedData };
  });

  assert.equal(
    await getPlaceDetailsService({ placeId: "ola-place-id" }),
    expectedData,
  );
});

test("Ola Maps requests fail explicitly when the API key is missing", async () => {
  delete process.env.OLA_MAPS_API_KEY;

  await assert.rejects(
    getAutocompleteService({ input: "Jaipur" }),
    { statusCode: 503, message: "Ola Maps is not configured" },
  );
});
