import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const requestTiming = new AsyncLocalStorage();

const logTiming = (fields) => {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), ...fields }));
};

export const apiTimingMiddleware = (req, res, next) => {
  if (!/^\/api(?:\/|$)/i.test(req.path)) return next();

  const timing = {
    requestId: randomUUID(),
    startedAt: performance.now(),
    supplierMs: 0,
    supplierCalls: 0,
    activeSupplierCalls: 0,
    supplierStartedAt: null,
  };
  res.setHeader("X-Request-Id", timing.requestId);

  const complete = () => {
    res.off("finish", complete);
    res.off("close", complete);
    const endedAt = performance.now();
    const totalMs = endedAt - timing.startedAt;
    const supplierMs = timing.supplierMs + (timing.activeSupplierCalls
      ? endedAt - timing.supplierStartedAt
      : 0);
    logTiming({
      event: "api_timing",
      requestId: timing.requestId,
      method: req.method,
      route: req.route ? `${req.baseUrl}${req.route.path}` : null,
      status: res.headersSent ? res.statusCode : null,
      outcome: res.writableFinished ? "finished" : "aborted",
      totalMs: Math.round(totalMs),
      supplierMs: Math.round(supplierMs),
      backendMs: Math.round(totalMs - supplierMs),
      supplierCalls: timing.supplierCalls,
    });
  };

  res.once("finish", complete);
  res.once("close", complete);
  return requestTiming.run(timing, next);
};

export const timeSupplierCall = async ({ supplier, operation, method }, execute) => {
  const timing = requestTiming.getStore();
  const startedAt = performance.now();
  if (timing) {
    timing.supplierCalls++;
    if (timing.activeSupplierCalls++ === 0) timing.supplierStartedAt = startedAt;
  }

  let status = null;
  let outcome = "error";
  try {
    const response = await execute();
    status = response.status ?? null;
    outcome = "response";
    return response;
  } catch (error) {
    status = error?.response?.status ?? null;
    if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) outcome = "timeout";
    throw error;
  } finally {
    const endedAt = performance.now();
    // Parallel calls share one wall-clock interval in the API summary.
    if (timing && --timing.activeSupplierCalls === 0) {
      timing.supplierMs += endedAt - timing.supplierStartedAt;
    }
    logTiming({
      event: "supplier_timing",
      requestId: timing?.requestId ?? null,
      supplier,
      operation,
      method,
      status,
      outcome,
      durationMs: Math.round(endedAt - startedAt),
    });
  }
};
