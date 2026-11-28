import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { apiTimingMiddleware, timeSupplierCall } from "../src/utils/apiTiming.js";

test("API timing correlates parallel calls, supplier timeouts and requests without supplier calls", async (t) => {
  const logs = [];
  t.mock.method(console, "info", (line) => logs.push(JSON.parse(line)));

  const app = express();
  const router = express.Router();
  app.use(apiTimingMiddleware);
  app.use("/api/v1", router);

  router.get("/hotels/:id", async (req, res) => {
    const supplierResponse = Promise.withResolvers();
    const timeout = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    const results = Promise.allSettled([
      timeSupplierCall({ supplier: "AKBAR", operation: "rooms" }, () =>
        supplierResponse.promise),
      timeSupplierCall({ supplier: "AKBAR", operation: "rates" }, () =>
        supplierResponse.promise.then(() => { throw timeout; })),
    ]);
    supplierResponse.resolve({ status: 200 });
    await results;
    res.sendStatus(504);
  });
  router.get("/cached", (req, res) => res.sendStatus(200));

  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const [hotel, cached] = await Promise.all([
    fetch(`${base}/hotels/example?secret=hidden`),
    fetch(`${base}/cached`),
  ]);

  const hotelLogs = logs.filter(({ requestId }) => requestId === hotel.headers.get("x-request-id"));
  const [rooms, rates, summary] = hotelLogs;
  assert.equal(hotelLogs.length, 3);
  assert.equal(rooms.event, "supplier_timing");
  assert.equal(rooms.status, 200);
  assert.equal(rates.outcome, "timeout");
  assert.equal(summary.event, "api_timing");
  assert.equal(summary.route, "/api/v1/hotels/:id");
  assert.equal(summary.status, 504);
  assert.equal(summary.supplierCalls, 2);
  assert.ok(summary.supplierMs <= summary.totalMs);
  assert.ok(Math.abs(summary.totalMs - summary.supplierMs - summary.backendMs) <= 1);
  const [cachedSummary] = logs.filter(({ requestId }) => requestId === cached.headers.get("x-request-id"));
  assert.equal(cachedSummary.supplierCalls, 0);
  assert.equal(cachedSummary.supplierMs, 0);
});
