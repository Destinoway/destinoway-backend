import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import * as shared from "@destinoway/shared";
import { asyncHandler } from "../src/middleware/asyncHandler.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import ApiError from "../src/utils/response/ApiError.js";
import { sendSuccess, sendError } from "../src/utils/response/ApiResponse.js";

test("existing helper imports resolve to the same shared functions and error class", () => {
  for (const [name, value] of Object.entries({ asyncHandler, errorHandler, ApiError, sendSuccess, sendError })) {
    assert.equal(value, shared[name]);
  }
  const error = new ApiError(409, "Already booked");
  assert(error instanceof shared.ApiError);
  assert(error instanceof Error);
});

test("shared and existing imports preserve the Express HTTP contracts", async (t) => {
  const app = express();
  const legacy = { asyncHandler, errorHandler, ApiError, sendSuccess, sendError };
  for (const [prefix, helpers] of [["shared", shared], ["legacy", legacy]]) {
    const router = express.Router();
    router.get("/success", helpers.asyncHandler(async (_req, res) => {
      await Promise.resolve();
      return helpers.sendSuccess(res, "Created", { bookingId: "booking-1" }, { page: 1 }, 201);
    }));
    router.get("/defaults", (_req, res) => helpers.sendSuccess(res));
    router.get("/existing-argument-order", (_req, res) => helpers.sendSuccess(res, { searchId: "search-1" }, "Search started"));
    router.get("/not-found", (_req, res) => helpers.sendError(res, "Not found", 404));
    router.get("/default-error", (_req, res) => helpers.sendError(res));
    router.get("/async-error", helpers.asyncHandler(async () => {
      await Promise.resolve();
      throw new helpers.ApiError(422, "Invalid pickup", { field: "pickup" });
    }));
    router.get("/sync-error", helpers.asyncHandler(() => { throw new Error("Unexpected failure"); }));
    router.get("/cast-error", () => { throw Object.assign(new Error("Cast failed"), { name: "CastError" }); });
    router.get("/duplicate", () => { throw Object.assign(new Error("Duplicate"), { code: 11000, keyValue: { email: "test@example.com" } }); });
    router.use(helpers.errorHandler);
    app.use(`/${prefix}`, router);
  }

  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const cases = [
    ["success", 201, { success: true, message: "Created", data: { bookingId: "booking-1" }, meta: { page: 1 } }],
    ["defaults", 200, { success: true, message: "Success", data: null, meta: null }],
    ["existing-argument-order", 200, { success: true, message: { searchId: "search-1" }, data: "Search started", meta: null }],
    ["not-found", 404, { success: false, message: "Not found", error: { statusCode: 404 } }],
    ["default-error", 500, { success: false, message: "Something went wrong", error: { statusCode: 500 } }],
    ["async-error", 422, { success: false, message: "Invalid pickup", error: { statusCode: 422, details: { field: "pickup" } } }],
    ["sync-error", 500, { success: false, message: "Unexpected failure", error: { statusCode: 500 } }],
    ["cast-error", 400, { success: false, message: "Invalid ID format", error: { statusCode: 400 } }],
    ["duplicate", 400, { success: false, message: "email already exists", error: { statusCode: 400 } }],
  ];
  for (const [route, status, body] of cases) {
    await t.test(route, async () => {
      for (const prefix of ["shared", "legacy"]) {
        const response = await fetch(`${base}/${prefix}/${route}`, { signal: AbortSignal.timeout(5000) });
        assert.equal(response.status, status);
        assert.match(response.headers.get("content-type"), /application\/json/);
        assert.deepEqual(await response.json(), body);
      }
    });
  }
});
