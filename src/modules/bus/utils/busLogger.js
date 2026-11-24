import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SENSITIVE_FIELD =
  /(authorization|cookie|password|secret|token|key|signature|credential|client.?id|merchant.?id)/i;

const redact = (value, field = "") => {
  if (["hasToken", "hasClientId"].includes(field) && typeof value === "boolean") {
    return value;
  }
  if (SENSITIVE_FIELD.test(field)) {
    return { redacted: true, present: value != null && value !== "" };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    const plain = typeof value.toJSON === "function" ? value.toJSON() : value;
    return Object.fromEntries(
      Object.entries(plain).map(([key, child]) => [key, redact(child, key)]),
    );
  }
  return value;
};

// Logging failures must never prevent obtaining or using a supplier session.
export const logBusEvent = async (event, details = {}) => {
  try {
    const line = JSON.stringify({
      ...redact(details),
      timestamp: new Date().toISOString(),
      source: "supplier_api",
      module: "bus",
      supplier: "AKBAR",
      operation: "bus_signature",
      event,
    });
    const logFile = path.resolve(
      process.env.AKBAR_BUS_API_LOG_FILE || "logs/akbar-bus-api-exchanges.jsonl",
    );
    try {
      await mkdir(path.dirname(logFile), { recursive: true });
      await appendFile(logFile, `${line}\n`, { encoding: "utf8", mode: 0o600 });
    } catch {
      console.error("[akbar_bus] Could not append bus API exchange log");
    }
    console.info(line);
  } catch {
    // Do not expose the original event (it may contain credentials).
    console.error("[akbar_bus] Could not serialize bus API event");
  }
};
